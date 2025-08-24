const { onCall } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const vision = require("@google-cloud/vision");

initializeApp();
const client = new vision.ImageAnnotatorClient();

exports.extractDataFromImage = onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }

  const imageBuffer = Buffer.from(request.data.image, "base64");

  try {
    const [result] = await client.textDetection(imageBuffer);
    if (!result.fullTextAnnotation) {
       return { no: null, principal: null, date: null };
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

    return parsedData;

  } catch (error) {
    console.error("Vision API Error:", error);
    throw new functions.https.HttpsError("internal", "An error occurred while processing the image.");
  }
});
