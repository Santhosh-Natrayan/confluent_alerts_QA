const express = require('express');
const nodemailer = require('nodemailer');
const axios = require('axios');
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

// POST endpoint to handle webhook, send email, and create a work item
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

    // Modify the title by removing content inside parentheses
    let title = payload.title.replace(/\(.*\)/, '').trim();

    // Extract and filter the message part from the payload
    let message = payload.message.split('Annotations:')[0];
    message = message.replace(/Value: .*?(Messages_behind=\d+)/, 'Value: $1')
                     .replace(/(Messages_behind=\d+)/g, '<strong>$1</strong>');

    // Extract the 'summary' field from 'commonAnnotations'
    let summary = '';
    if (payload.commonAnnotations && payload.commonAnnotations.summary) {
      summary = payload.commonAnnotations.summary.trim(); // Extract and trim the summary value
      console.log('Extracted Summary:', summary); // Debug log for extracted summary
    } else {
      console.log('Summary not found in commonAnnotations:', payload.commonAnnotations); // Debug log if no summary found
    }

    // Get the status of the alert (assuming it's available in the payload)
    const status = payload.status; // Example: 'firing' or 'resolved'

    // Only append summary if the status is 'firing'
    if (status === 'firing' && summary) {
      message += `<br><strong>Summary:</strong> <span style="color: red;">${summary}</span>`; // Make only the summary content red
    }

    // Determine the type of alert and generate a unique ID or use the provided one
    const alertIdPrefix = message.toLowerCase().includes('firing') ? 'ALR' : 'RES';
    const alertId = payload.alertId || generateUniqueId(alertIdPrefix); // Use provided alertId or generate a new one
    console.log('Generated or Received Alert ID:', alertId);

    // Send an email with the filtered title and message, including the alert ID
    await sendEmail(alertId, title, message);

    // Create a work item in Azure DevOps
    const workItemData = { title, description: message }; // Define work item fields
    const response = await createWorkItem(workItemData);
    console.log('Work item created:', response.data);

    // Respond to the client
    res.status(200).send(`Alert email sent and work item created successfully. Alert ID: ${alertId}`);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    res.status(500).send('Error processing webhook');
  }
});

// Function to generate unique alert ID with a random suffix
function generateUniqueId(status) {
  const timestamp = Date.now().toString(36); // Current timestamp converted to base 36
  const randomSuffix = Math.floor(Math.random() * 36).toString(36); // Random suffix
  return `${status}-${timestamp}${randomSuffix}`;
}

// Function to send an email
async function sendEmail(alertId, title, message) {
  const transporter = nodemailer.createTransport({
    service: 'Outlook',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  message = message.replace(/Value:/g, '<strong>Value:</strong>')
                   .replace(/Labels:/g, '<strong>Labels:</strong>')
                   .replace(/ - /g, '<strong> - </strong>');

  const footer = `<br><br><strong><em>This Alert is Generated By Software Factory Team</em></strong>
                  <br><img src="https://mspmovil.com/en/wp-content/uploads/software-factory.png" alt="Software Factory Logo" width="142" height="60" />
                  <br><strong>Message ID:</strong> ${alertId}`;

  const recipients = [
    process.env.EMAIL_TO,
    process.env.EMAIL_TO_1,
    process.env.EMAIL_TO_2,
    //process.env.EMAIL_TO_3,
    // process.env.EMAIL_TO_4,
    // process.env.EMAIL_TO_5,
    // process.env.EMAIL_TO_6,
    // process.env.EMAIL_TO_7,
    // process.env.EMAIL_TO_8,
    // process.env.EMAIL_TO_9,
    // process.env.EMAIL_TO_10,
    // process.env.EMAIL_TO_11,
    // process.env.EMAIL_TO_12,
    // process.env.EMAIL_TO_13
  ].join(', ');

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: recipients,
    subject: `${title}`,
    html: `<p><strong>Title:</strong> <b>${title}</b></p>
           <p><strong>Message:</strong></p>
           <pre style="white-space: pre-wrap;">${message}</pre>
           ${footer}`,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Email sent successfully to all recipients. Message ID: ${alertId}`);
}

// Function to create a work item in Azure DevOps
async function createWorkItem(workItemData) {
  const organization = 'TICMPL';
  const project = 'Training';
  const personalAccessToken = process.env.PAT;
  const type = 'Bug';

  const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/$${type}?api-version=6.0`;
  
  const workItemFields = [
    {
      op: 'add',
      path: '/fields/System.Title',
      value: workItemData.title,
    },
    {
      op: 'add',
      path: '/fields/System.Description',
      value: workItemData.description,
    },
  ];

  const config = {
    headers: {
      'Content-Type': 'application/json-patch+json',
      Authorization: `Basic ${Buffer.from(`:${personalAccessToken}`).toString('base64')}`,
    },
  };

  return axios.post(url, workItemFields, config);
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
