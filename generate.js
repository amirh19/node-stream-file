import fs from "fs";
import openpgp from "openpgp";
const writeStream = fs.createWriteStream("./private.key");
const publicStream = fs.createWriteStream("./public.key");
async function generateKey() {
  const { privateKey, publicKey } = await openpgp.generateKey({
    type: "ecc", // Type of the key, defaults to ECC
    curve: "curve25519", // ECC curve name, defaults to curve25519
    userIDs: [{ name: "Amir Alcocer", email: "amir.alcocer@gmail.com" }], // you can pass multiple user IDs
    passphrase: "amir123", // protects the private key
    format: "armored", // output key format, defaults to 'armored' (other options: 'binary' or 'object')
  });
  writeStream.write(privateKey, "utf-8");
  publicStream.write(publicKey, "utf-8");
}
generateKey();
