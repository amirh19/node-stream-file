import express from "express";
import papaparse from "papaparse";
import formidable from "formidable";
import openpgp from "openpgp";
import fs from "fs";
import { resolve } from "path";

const app = express();
app.post("/", async (req, res) => {
  let chunks = 0;
  res.writeHead(201);
  const ReadWriteStream = new PassThrough();
  const form = formidable({
    maxFileSize: Math.pow(1024, 3),
    fileWriteStreamHandler: () => {
      const papastream = papaparse.parse(papaparse.NODE_STREAM_INPUT, {});
      // Duplex
      papastream.on("data", () => {
        console.log(++data);
      });
      papastream.on("end", () => {
        console.log("============= PAPASTREAM IS DONE ==============");
      });
      ReadWriteStream.pipe(papastream);
      return ReadWriteStream;
    },
  });
  const message = await openpgp.createMessage({
    binary: ReadWriteStream,
    format: "binary",
  });
  const pgpPublickKey = fs.readFileSync("private.key", "utf8");

  // ReadStream
  /**@type {Stream} */
  const encrypted = await openpgp.encrypt({
    message, // input as Message object
    encryptionKeys: await openpgp.readKey({
      armoredKey: pgpPublickKey,
    }),
    format: "armored",
    config: { preferredCompressionAlgorithm: openpgp.enums.compression.zip },
  });

  const writeStream = fs.createWriteStream(resolve() + "/write.txt");
  encrypted.pipe(writeStream);
  form.on("error", (error) => {
    console.log(error);
  });
  form.parse(req, () => {
    console.log("FINISHED PARSING, WAITING TO STOP WRITING");
    writeStream.on("close", () => {
      console.log("FINISHED");
      res.end("done");
    });
  });
});
app.get("/decrypted", async (req, res) => {
  const filePath = resolve() + "/write.txt";
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
app.listen(3000, () => {
  console.log("listening on port 3000");
});
