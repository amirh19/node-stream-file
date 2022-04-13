import express from "express";
import papaparse from "papaparse";
import formidable from "formidable";
import openpgp from "openpgp";
import fs from "fs";
import { resolve } from "path";
import { PassThrough } from "stream";

const app = express();
app.post("/", async (req, res) => {
  let chunks = 0;
  const form = formidable({
    fileWriteStreamHandler: () => {
      const papastream = papaparse.parse(papaparse.NODE_STREAM_INPUT, {});
      // Duplex
      papastream.on("data", (data) => {
        //data is array
      });
      return papastream;
    },
  });
  // res -> formidable -> papaparse -> encrypt -> sftp
  const duplex = new PassThrough();
  const message = await openpgp.createMessage({
    binary: duplex,
    format: "binary",
  });

  // ReadStream
  /**@type {Stream} */
  const encrypted = await openpgp.encrypt({
    message, // input as Message object
    passwords: ["secret stuff"], // multiple passwords possible
    format: "armored",
  });

  const writeStream = fs.createWriteStream(resolve() + "/write.txt");
  encrypted.pipe(writeStream);
  form.onPart = (part) => {
    part.on("data", (data) => {
      duplex.push(data, "utf-8");
    });
    form._handlePart(part);
  };
  form.parse(req, () => {
    duplex.push(null);
    res.send("okay");
  });
});
app.get("/decrypted", async (req, res) => {
  const filePath = resolve() + "/write.txt";
  const readStream = fs.createReadStream(filePath, { encoding: "utf-8" });
  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    "Content-Type": "text/plain",
    "Content-Length": stat.size,
  });
  const encryptedMessage = await openpgp.decrypt({
    message: await openpgp.readMessage({
      armoredMessage: readStream,
    }),
  });
  const { data: decrypted } = await openpgp.decrypt({
    message: encryptedMessage,
    passwords: ["secret stuff"], // decrypt with password
    format: "binary", // output as Uint8Array
  });
  readStream.on("pause", () => {
    console.log("============= PAUSED =================== ");
  });
  decrypted.on("error", () => console.log("error=?"));
  decrypted.on("data", console.log);
  decrypted.pipe(res);
});
app.listen(3000, () => {
  console.log("listening on port 3000");
});
