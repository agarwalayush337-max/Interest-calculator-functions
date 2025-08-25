const { http } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const vision = require("@google-cloud/vision");
const cors = require("cors")({ origin: true });

initializeApp();
const client = new vision.ImageAnnotatorClient();

exports.extractDataFromImage = http.onRequest({ cors: true }, async (req, res) => {
  // For a standard HTTP request, the data is in req.body.data
  const imageBuffer = Buffer.from(req.body.data.image, "base64");

  try {
    const [result] = await client.textDetection(imageBuffer);
    if (!result.fullTextAnnotation) {
       console.log("No text found in the image.");
       res.status(200).send({ data: { no: null, principal: null, date: null } });
       return;
    }
    const fullText = result.fullTextAnnotation.text;

    let parsedData = { no: null, principal: null, date: null };
    const noRegex = /\b([A-Z]\s*\.?\s*\d+)\b/i;
    const dateRegex = /(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/;
    const principalRegex = /(?:₹|\b)\s*([\d,]{3,}(?:\.\d{2})?)\b/;

    const noMatch = fullText.match(noRegex);
    if (noMatch) { parsedData.no = noMatch[0].replace(/\s/g, "").toUpperCase(); }

    const dateMatch = fullText.match(dateRegex);
    if (dateMatch) { parsedData.date = dateMatch[0].replace(/-/g, "/"); }

    const principalMatch = fullText.match(principalRegex);
    if (principalMatch) { parsedData.principal = principalMatch[1].replace(/,/g, ""); }

    // Send the data back in the correct format
    res.status(200).send({ data: parsedData });

  } catch (error) {
    console.error("Vision API Error:", error);
    res.status(500).send({ error: "An error occurred while processing the image." });
  }
});
