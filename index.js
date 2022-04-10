import express from "express";
import papaparse from "papaparse";
import formidable from "formidable";
const app = express();
app.post("/", (req, res) => {
  let chunks = 0;
  const form = formidable({
    fileWriteStreamHandler: () => {
      const papastream = papaparse.parse(papaparse.NODE_STREAM_INPUT, {});
      papastream.on("data", (chunk) => {
        chunks++;
        console.log(chunks + "\n" + chunk.toString("utf8"));
      });
      papastream.on("end", () => res.send("okay"));
      return papastream;
    },
  });
  form.onPart = (part) => {
    form._handlePart(part);
  };
  form.parse(req);
});

app.listen(3000, () => {
  console.log("listening on port 3000");
});
