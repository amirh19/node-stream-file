import express from "express";
import papaparse from "papaparse";
import formidable from "formidable";
import openpgp from "openpgp";
import fs from "fs";
import { resolve } from "path";
import { PassThrough, Duplex } from "stream";

const app = express();
app.post("/", async (req, res) => {
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
  const encrypted = fs.createReadStream(filePath, { encoding: "utf-8" });
  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    "Content-Type": "text/plain",
    "Content-Length": stat.size,
  });
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
  });
  decrypted.data.pipe(res);
});
app.listen(3000, () => {
  console.log("listening on port 3000");
});
