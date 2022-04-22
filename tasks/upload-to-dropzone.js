import openpgp from "openpgp";
import { resolve } from "path";
import fs from "fs";
const uploadToDropzone = async () => {
  process.on("exit", () => console.log("exited"));
  const fileStream = fs.createReadStream(process.env.FILE_PATH);
  const message = await openpgp.createMessage({
    binary: fileStream,
    format: "binary",
  });
  const pgpPublickKey = fs.readFileSync(resolve() + "/private.key", "utf8");

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

  const writeStream = fs.createWriteStream(
    resolve() + `/write-child-${Date.now()}.txt`
  );
  encrypted.pipe(writeStream);
};

uploadToDropzone();
