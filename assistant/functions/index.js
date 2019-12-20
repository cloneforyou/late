const { dialogflow } = require('actions-on-google')

const functions = require('firebase-functions')

const app = dialogflow({ debug: true })

app.intent('late_login_yes', (conv) => {
  conv.close('In order for you to login, you must fill out the RPI CAS Form on your device.')
})

// Set the DialogflowApp object to handle the HTTPS POST request.
exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app)
