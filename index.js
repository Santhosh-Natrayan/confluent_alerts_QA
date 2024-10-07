const express = require('express');
const nodemailer = require('nodemailer');

require('dotenv').config();

const app = express();
const port = 3000; // Change to your desired port number

// Middleware to parse JSON bodies
app.use(express.json());

// GET endpoint for testing
app.get('/webhook', async (req, res) => {
  console.log('GET request received');
  res.status(200).send("GET Reached");
});

// POST endpoint to handle webhook and send email
app.post('/webhook', async (req, res) => {
  console.log('POST request received');
  try {
    // Log the incoming request body
    const payload = req.body;
    console.log('Request Payload:', payload);

    // Validate payload
    if (!payload.title || !payload.message) {
      console.log('Invalid payload:', payload);
      return res.status(400).send('Invalid payload');
    }

    // Extract the title and message part from the payload
    const title = payload.title;
    const message = payload.message;
    console.log('Received title:', title);
    console.log('Received message:', message);

    // Send an email with the payload
    await sendEmail(title, message);

    // Respond to the client
    res.status(200).send('Alert email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).send('Error sending email');
  }
});

// Function to send an email
async function sendEmail(title, message) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Extract the part before the brackets and the part within brackets
  const titleParts = title.match(/^(.*?)\s(\(.*\))$/);
  const mainTitle = titleParts ? titleParts[1] : title;  // The part before the brackets
  const titleInBrackets = titleParts ? titleParts[2] : ''; // The part inside the brackets

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: [process.env.EMAIL_TO, process.env.EMAIL_TO_1].join(', '), // Only EMAIL_TO and EMAIL_TO_1
    subject: `Webhook Alert: ${title}`,

    // Use HTML to format the title (bold for the main part, normal for the bracket part)
    html: `<p><strong>Alert:</strong></p>
           <p><strong>Title:</strong> <b>${mainTitle}</b> ${titleInBrackets}</p>
           <p><strong>Message:</strong> ${message}</p>`
  };

  await transporter.sendMail(mailOptions);
  console.log('Email sent successfully to EMAIL_TO and EMAIL_TO_1');
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
