import express from "express";
import papaparse from "papaparse";
import formidable from "formidable";
import openpgp from "openpgp";
import fs from "fs";
import { resolve } from "path";
import { PassThrough } from "stream";
import { spawn } from "child_process";
const app = express();
app.get("/", (req, res) => {
  res.sendFile(resolve() + "/public/index.html");
});
app.post("/", async (req, res) => {
  const localFile = resolve() + `/write-${Date.now()}.txt`;
  const args = ["./tasks/upload-to-dropzone.js"];
  const child = spawn(process.execPath, args, {
    env: {
      FILE_PATH: localFile,
    },
    stdio: ["pipe", "inherit", "inherit"],
    detached: true,
  });
  child.unref();
  const ReadWriteStream = new PassThrough();
  const form = formidable({
    maxFileSize: Math.pow(1024, 3),
    fileWriteStreamHandler: () => {
      const papastream = papaparse.parse(papaparse.NODE_STREAM_INPUT, {});
      // Duplex
      papastream.on("data", () => {});
      papastream.on("end", () => {
        console.log("============= PAPASTREAM IS DONE ==============");
      });
      ReadWriteStream.pipe(papastream);
      return ReadWriteStream;
    },
  });
  const fileStream = fs.createWriteStream(localFile);
  ReadWriteStream.pipe(fileStream);
  form.on("error", (error) => {
    console.log(error);
  });
  form.parse(req, () => {
    console.log("FINISHED PARSING");
    res.send({ id: child.pid });
  });
});
app.get("/decrypted", async (req, res) => {
  const filePath = resolve() + "/write-child.txt";
  const encrypted = fs.createReadStream(filePath, { encoding: "utf-8" });
  const privateKeyArmored = fs.readFileSync("private.key", "utf8");
  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({ armoredKey: privateKeyArmored }),
    passphrase: "amir123",
  });
  const message = await openpgp.readMessage({
    armoredMessage: encrypted, // parse armored message
  });
  const decrypted = await openpgp.decrypt({
    message,
    decryptionKeys: privateKey,
    format: "binary",
  });
  res.setHeader(
    "Content-disposition",
    "attachment; filename=" + "decrypted.txt"
  );
  res.setHeader("Content-type", "plain/text");
  decrypted.data.pipe(res);
});
app.get("/status", (req, res) => {
  function checkRunning(pid, cb) {
    try {
      process.kill(pid, 0);
      return cb(null, false);
    } catch (error) {
      return cb(error.code === "ESRCH" ? null : error, true);
    }
  }
  const pid = req.query.id;
  return checkRunning(pid, (error, done) => {
    if (error) {
      return res.send({ done: true, error });
    }
    return res.send({ done: done });
  });
});
app.listen(3000, () => {
  console.log("listening on port 3000");
});
