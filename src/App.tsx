import axios from "axios";
import { useState } from "react"
import { Form } from "react-bootstrap"
import createImageAnalysisClient, {
  DenseCaptionOutput,
  ImageAnalysisClient,
  DetectedPersonOutput,
  DetectedTextBlockOutput,
  DetectedObjectOutput,
  CropRegionOutput,
  DetectedTagOutput,
  isUnexpected
} from '@azure-rest/ai-vision-image-analysis';
import { AzureKeyCredential } from '@azure/core-auth';
import { Buffer } from "buffer";
import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
import fs from 'fs';

function App() {
  const [file, setFile] = useState();
  const [response, setResponse] = useState("");
  const handleChange = (e) => {
      setFile(URL.createObjectURL(e.target.files[0]));
  }

  const endpoint = "https://azureaiaiojff.cognitiveservices.azure.com/";
  const key = "";
  const credential = new AzureKeyCredential(key);

  const client = createImageAnalysisClient(endpoint, credential);

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const handleRun = async () => {
    fetch(file)
    .then(response => response.blob())
    .then(blob => blobToBase64(blob))
    .then(async base64 => {
      const jsonBody = {"messages": 
        [
            {
                "role":"system",
                "content": [
                    {
                    "type": "text",
                    "text": "You are a specialized AI model designed to analyze and identify key elements in images taken at Heineken Vietnam’s sponsored bars and restaurants. Your primary task is to assist in automating the image analysis process, focusing on the following elements:\nDetect and Count these elements is crucial: Products, People and Promotional Material.\nBrand Logos: Identify logos of Heineken, Tiger, Bia Viet, Larue, Bivina, Edelweiss, and Strongbow.\nProducts: Detect beer kegs and beer bottles. Beer carton/ cases (thùng bia), Beer crate (két bia), Beer bottle (chai bia), Beer can (lon bia)\nPeople: Drinker or Promotion Girl or Seller or Buyer/Customer\nAnalyze the quantity of consumers, their activities (Eating, Drinking, Smiling, Talking, Shopping), and their emotions (Happy, Angry, Enjoyable, Relaxed, Neutral)\n.\nPromotional Material: Spot posters, banners, and billboards, Ice bucket, Ice box, Fridge, Signage, billboard, poster, standee, Tent card, display stand, tabletop, Parasol\n.\nSetup Context: Determine the type of venue—bar, restaurant, grocery store, or supermarket-- Scene: bar, pub, restaurant, grocery store, supermarket, party, celebration, gathering, happy hour, fun time; Environment: indoor or outdoor\n.\nBehavior and Formatting Guidelines:\nIdentification and Analysis:\nAccurately identify and categorize the specified elements in the images.\nProvide detailed analysis of each identified element, including its location and context within the image.\nContext Awareness:\nMaintain awareness of the branding and marketing context of Heineken Vietnam.\nEnsure that the identification and analysis align with enhancing promotional campaigns, consumer understanding, and improving sales experiences.\nResponse Formatting:\nPresent findings in a clear and structured format.\nUse bullet points or numbered lists for easy readability.\nInclude confidence levels for each identified element.\nPersonality and Tone:\nAdopt a professional and concise tone.\nBe informative and precise in your responses.\nAvoid unnecessary technical jargon to ensure clarity for all users.\nLimitations and Boundaries:\nDo not provide responses outside the scope of image analysis and the specified elements.\nAvoid speculative analysis and stick to the data available in the images.\nRespect privacy and confidentiality of any sensitive information contained within the images."
                    }
                ]
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": base64
                    }
                ]
            },
            {
                "role": "assistant",
                "content": [
                    {
                        "type": "text",
                        "text": "Based on the image provided, here is the analysis:\n\n- **Products:**\n  - Multiple Tiger beer bottles are visible on the table, both full and empty.\n  - A beer crate branded with Tiger is under the table.\n  - An ice bucket with the Tiger logo is present on the ground next to the table, filled with ice and bottles.\n  - A white ice box with the Tiger logo is visible next to the beer crate.\n\n- **People:**\n  - There are at least seven individuals visible, engaging in a social gathering.\n  - Activities include eating and drinking, with some individuals appearing to be in conversation.\n  - Emotions observed seem to be relaxed and enjoyable, as it is a social setting.\n\n- **Promotional Material:**\n  - The beer crate and ice bucket both serve as promotional items with the Tiger logo prominently displayed.\n  - No posters, banners, or other types of promotional material with the specified brand logos are clearly visible.\n\n- **Setup Context:**\n  - The venue appears to be an outdoor setting, likely a street-side restaurant or bar based on the presence of the food and drinks, plastic chairs, and the informal arrangement.\n  - Scene: Gathering, possibly enjoying a happy hour or a casual fun time.\n  - Environment: Outdoor.\n\n- **Brand Logos:**\n  - The Tiger logo is visible on the beer bottles, ice bucket, and the beer crate.\n\nPlease note that the analysis excludes any blurred faces to respect privacy."
                    }
                ]
            }
        ],
        "temperature": 0.7,
        "top_p": 0.95,
        "max_tokens": 800
    }
    
    axios.post("https://instanceopenaitest.openai.azure.com/openai/deployments/openaitestvisionpreview/chat/completions?api-version=2024-02-15-preview", jsonBody, {
      headers: {
        "api-key": ""
      }
    }).then(result => {console.log(result); setResponse(result.data.choices[0].message.content)}).catch(error => console.log(error))

    // const imageUrl = "https://res.cloudinary.com/des1wwmxu/image/upload/v1719682250/jxuwfsdbciy78vazkihj.jpg";
    const features = ["Caption", "DenseCaptions", "Objects", "People", "Read", "SmartCrops", "Tags"];
    // const result = await client.path("/imageanalysis:analyze").post({
    //   body: {
    //     url: imageUrl,
    //   },
    //   queryParameters: {
    //     features: features,
    //     "smartCrops-aspect-ratios": [0.9, 1.33],
    //   },
    //   contentType: "application/json",
    // });

    // const imageBuffer: Buffer = fs.readFileSync(Uint8Array);

    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const result = await client.path('/imageanalysis:analyze').post({
      body: buffer,
      queryParameters: {
        features: features,
        'smartCrops-aspect-ratios': [0.9, 1.33]
      },
      contentType: 'application/octet-stream'
    });

    console.log("Image analysis result:", result.body);

    const canvas = createCanvas(800, 600); // Create a canvas
    const ctx = canvas.getContext('2d'); // Get 2D rendering context

    try {
        // Load image from buffer
        const image = await loadImage(buffer);
        canvas.width = image.width; // Set canvas width
        canvas.height = image.height; // Set canvas height

        // Draw the image on the canvas
        ctx.drawImage(image, 0, 0, image.width, image.height);

        

        // Prepare for drawing
        const color = 'cyan';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.font = '16px Sans-serif';

        // Iterate over detected objects
        for (const detectedObject of result.objectsResult.values) {
            if (detectedObject.tags[0].name === 'person') {
                // Print object name and confidence
                console.log(`${detectedObject.tags[0].name} (confidence: ${detectedObject.tags[0].confidence * 100}%)`);

                // Draw bounding box
                const { x, y, width, height } = detectedObject.bounding_box;
                ctx.strokeRect(x, y, width, height);

                // Annotate object
                ctx.fillStyle = color;
                ctx.fillText(detectedObject.tags[0].name, x, y);
            }
        }

        // Save annotated image
        const outputfile = 'people.jpg';
        const out = fs.createWriteStream(outputfile);
        const stream = canvas.createJPEGStream({ quality: 0.95 });
        stream.pipe(out);
        out.on('finish', () => console.log('Results saved in', outputfile));
    } catch (error) {
        console.error('Error:', error);
    }
  
  })

  }

  return (
    <div className="container" style={{width: "90%", flexDirection: "column", justifyContent: "center", alignItems: "center"}}>
      <div className="container d-flex flex-column">
        <h1>IMAGE ANALYSIS TOOL</h1>
        <Form.Group controlId="formFile" className="mb-3">
          <Form.Label>Input Image</Form.Label>
          <Form.Control type="file" onChange={handleChange}/>
        </Form.Group>
        <button onClick={handleRun}>RUN</button>
        <img src={file} style={{width: "50%", height: "auto"}}/>
      </div>
      <p style={{whiteSpace: "pre-line"}}>{response}</p>
    </div>
  )
}

export default App
