const express = require('express');
const axios = require('axios');

require('dotenv').config();

const app = express();
const port = 3000; // Change to your desired port number

// Middleware to parse JSON bodies
app.use(express.json());

// POST endpoint to handle webhook
app.post('/webhook', async (req, res) => {
  try {
    // Extract payload data from the request
    const payload = req.body;

    // Assuming payload contains data needed to create a work item
    const workItemData = {
      // Define your work item fields here
      title: payload.title,
      description: payload.description,
      // Add more fields as needed
    };

    // Call Azure DevOps API to create a work item
    const response = await createWorkItem(workItemData);

    // Handle response from Azure DevOps API
    console.log('Work item created:', response.data);

    // Respond to the client
    res.status(200).send('Work item created successfully');
  } catch (error) {
    console.error('Error creating work item:', error.response.data);
    res.status(500).send('Error creating work item');
  }
});

// Function to create a work item using Azure DevOps API
async function createWorkItem(workItemData) {
  const organization = 'TICMPL';
  const project = 'Training';
  const personalAccessToken = process.env.PAT;
  const type = 'Bug'

  const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/$${type}?api-version=6.0`;
  //const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/${type}?api-version=7.1-preview.3`

  // Define the work item fields
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
    // Add more fields as needed
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
