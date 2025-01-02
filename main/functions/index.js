const functions = require("firebase-functions");
const twilio = require("twilio");

// Twilio credentials
const accountSid = "";
const authToken = "";
const client = twilio(accountSid, authToken);

// Twilio Verify Service SID
const serviceSid = "VA9d2188f1de17ed582aa07676685512b9";

// Request OTP Cloud Function
exports.requestOtp = functions.https.onRequest(async (req, res) => {
  const { phoneNumber } = req.body; // Extract phoneNumber from the request body

  if (!phoneNumber) {
    return res.status(400).json({ status: "error", message: "Phone number is required" });
  }

  try {
    const verification = await client.verify.v2.services(serviceSid)
      .verifications.create({ to: phoneNumber, channel: "sms" });

    return res.status(200).json({
      status: "success",
      message: "OTP sent successfully!",
      sid: verification.sid,
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// Verify OTP Cloud Function
exports.verifyOtp = functions.https.onRequest(async (req, res) => {
  const { phoneNumber, otp } = req.body; // Extract phoneNumber and OTP from the request body

  if (!phoneNumber || !otp) {
    return res.status(400).json({
      status: "error",
      message: "Phone number and OTP are required",
    });
  }

  try {
    const verificationCheck = await client.verify.v2.services(serviceSid)
      .verificationChecks.create({ to: phoneNumber, code: otp });

    if (verificationCheck.status === "approved") {
      return res.status(200).json({
        status: "success",
        message: "Phone number verified successfully!",
      });
    } else {
      return res.status(401).json({
        status: "error",
        message: "Invalid OTP",
      });
    }
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// const functions = require('firebase-functions/v1');
// const admin = require('firebase-admin');

// admin.initializeApp();

// exports.checkDocumentExpiry = functions.pubsub.schedule('every 5 seconds').onRun(async (context) => {
//     try {
//         const firestore = admin.firestore();
//         const tables = ['Certification', 'License', 'Others', 'Travel', 'Vaccination'];
//         const notificationPromises = [];

//         // Iterate through each table
//         for (const table of tables) {
//             // Retrieve all documents from the current table
//             const documentsSnapshot = await firestore.collection(table).get();

//             // Iterate through each document
//             documentsSnapshot.forEach(async (doc) => {
//                 const data = doc.data();
//                 const expiryDate = new Date(data.ExpiryDate);
//                 const title = data.Title; // Assuming there's a field named "Title" in each document

//                 // Get today's date
//                 const today = new Date();
//                 today.setHours(0, 0, 0, 0);

//                 // Calculate the difference in days
//                 const differenceInDays = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));

//                 // Check if the document is 30 days to expiry, 14 days to expiry, or expired
//                 let message = '';
//                 if (differenceInDays === 30) {
//                     message = `This is a friendly reminder that your ${title} will expire in 30 days.\nPlease renew it immediately to ensure compliance and maintain eligibility.\n- The CerTracker Team`;
//                 } else if (differenceInDays === 14) {
//                     message = `This is a friendly reminder that your ${title} will expire in 14 days.\nPlease renew it immediately to ensure compliance and maintain eligibility.\n- The CerTracker Team`;
//                 } else if (differenceInDays < 0) {
//                     const daysExpired = Math.abs(differenceInDays);

//                     // Check if the expired notification has been sent less than 3 times
//                     const expiredNotificationCount = data.expiredNotificationCount || 0;

//                     if (expiredNotificationCount < 3) {
//                         if (expiredNotificationCount === 2) {
//                             message = `Your ${title} has expired ${daysExpired === 1 ? '1 day ago' : `${daysExpired} days ago`}.\nThis is your final reminder to renew it immediately to ensure compliance.\n- The CerTracker Team`;
//                         } else {
//                             message = `Your ${title} has expired ${daysExpired === 1 ? '1 day ago' : `${daysExpired} days ago`}.\nPlease renew it immediately to ensure compliance.\n- The CerTracker Team`;
//                         }

//                         // Update the expired notification count in the document
//                         await firestore.collection(table).doc(doc.id).update({
//                             expiredNotificationCount: expiredNotificationCount + 1
//                         });
//                     }
//                 }

//                 if (message) {
//                     // Retrieve user ID from the document
//                     const userId = data.userId;

//                     // Retrieve user data to get FCM token and email
//                     const userDataDoc = await firestore.collection('users').doc(userId).get();
//                     const userData = userDataDoc.data();
//                     const fcmToken = userData.fcmToken;
//                     const email = userData.email;

//                     // Add promises for sending notifications to the array
//                     notificationPromises.push(sendNotification(fcmToken, `${title} Exp. Reminder`, message));

//                     // Add expired/soon-to-expire document details to the "mail" collection
//                     await addMailDocument(firestore, email, `${title}`, message, differenceInDays);

//                     // Add notification details to the "Notification" collection
//                     await admin.firestore().collection('Notification').add({
//                         title: `${title} Expiration Reminder`,
//                         body: message,
//                         category: `${table}`,
//                         read: false,
//                         userId: userId,
//                         timestamp: admin.firestore.FieldValue.serverTimestamp()
//                     });
//                 }
//             });
//         }

//         // Wait for all notification promises to resolve
//         await Promise.all(notificationPromises);

//         return null;
//     } catch (error) {
//         console.error('Error occurred:', error);
//         throw new functions.https.HttpsError('unknown', 'An error occurred while checking document expiry.');
//     }
// });

// async function sendNotification(fcmToken, title, body) {
//     const message = {
//         notification: {
//             title: title,
//             body: body
//         },
//         token: fcmToken
//     };

//     try {
//         await admin.messaging().send(message);
//         console.log('Notification sent successfully:', message);
//     } catch (error) {
//         console.error('Error sending notification:', error);
//     }
// }

// async function addMailDocument(firestore, email, title, text, differenceInDays) {
//     try {
//         let htmlContent = '';

//         if (differenceInDays === 30) {
//             htmlContent = `
//                 <p>This is a friendly reminder that your ${title} will expire in 30 days.</p>
//                 <p>Please ensure timely renewal to avoid any disruptions to your services or compliance requirements.</p>
//                 <p>If you have any questions or need assistance regarding the renewal process, feel free to contact our support team.</p>
//                 <p>Thank you for your attention to this matter.</p>
//                 <p>- The CerTracker Team</p>
//             `;
//         } else if (differenceInDays === 14) {
//             htmlContent = `
//                 <p>This is a friendly reminder that your ${title} will expire in 14 days.</p>
//                 <p>Please ensure timely renewal to avoid any disruptions to your services or compliance requirements.</p>
//                 <p>If you have any questions or need assistance regarding the renewal process, feel free to contact our support team.</p>
//                 <p>Thank you for your attention to this matter.</p>
//                 <p>- The CerTracker Team</p>
//             `;
//         } else if (differenceInDays < 0) {
//             const daysExpired = Math.abs(differenceInDays);
//             const isFinalReminder = differenceInDays === 2;

//             htmlContent = `
//                 <p>Your ${title} has expired ${daysExpired === 1 ? '1 day ago' : `${daysExpired} days ago`}.</p>
//                 <p>${isFinalReminder ? 'This is your final reminder to renew it immediately to ensure compliance.' : 'Please renew it immediately to maintain compliance.'}</p>
//                 <p>If you have any questions or need assistance regarding the renewal process, feel free to contact our support team.</p>
//                 <p>Thank you for your attention to this matter.</p>
//                 <p>- The CerTracker Team</p>
//             `;
//         } else {
//             htmlContent = `
//                 <p>${text}</p>
//                 <p>Please ensure timely renewal to avoid any disruptions to your services or compliance requirements.</p>
//                 <p>If you have any questions or need assistance regarding the renewal process, feel free to contact our support team.</p>
//                 <p>Thank you for your attention to this matter.</p>
//                 <p>- The CerTracker Team</p>
//             `;
//         }

//         // Add document to the "mail" collection with HTML content
//         await firestore.collection('mail').add({
//             to: [email],
//             message: {
//                 subject: `${title} Expiration Reminder`,
//                 text: text, // Plain text content for compatibility
//                 html: htmlContent
//             }
//         });

//         console.log('Mail document added successfully.');
//     } catch (error) {
//         console.error('Error adding mail document:', error);
//     }
// }

// const functions = require("firebase-functions/v1");
// const admin = require("firebase-admin");

// admin.initializeApp();

// exports.sendChristmasGreetings = functions
//   .runWith({ timeoutSeconds: 540 }) // Extend timeout to 9 minutes
//   .https.onRequest(async (req, res) => {
//     try {
//       const firestore = admin.firestore();

//       // Fetch all users from the "users" collection
//       const usersSnapshot = await firestore.collection("users").get();

//       if (usersSnapshot.empty) {
//         console.log("No users found.");
//         return res.status(200).send("No users to send greetings to.");
//       }

//       const userEmails = [];
//       usersSnapshot.forEach((doc) => {
//         const userData = doc.data();
//         if (userData.email) {
//           userEmails.push(userData.email);
//         }
//       });

//       if (userEmails.length === 0) {
//         console.log("No valid emails found.");
//         return res.status(200).send("No valid emails to send greetings to.");
//       }

//       console.log(`Processing emails for ${userEmails.length} recipients in the background.`);

//       // Perform email processing in the background
//       processEmailsInBatches(userEmails, firestore);

//       res.status(200).send("Email processing started. Emails will be sent in the background.");
//     } catch (error) {
//       console.error("Error initializing email processing:", error);
//       res.status(500).send("An error occurred while initializing email processing.");
//     }
//   });

// // Function to process emails in batches
// async function processEmailsInBatches(emails, firestore) {
//   const batchSize = 10;
//   const delayBetweenBatches = 50000; // 50 seconds

//   for (let i = 0; i < emails.length; i += batchSize) {
//     const batch = emails.slice(i, i + batchSize);

//     const emailPromises = batch.map((email) =>
//       firestore.collection("mail").add({
//         to: [email],
//         message: {
//           subject: "Merry Christmas from CerTracker!",
//           html: `
//             <html>
//               <body>
//                 <img src="https://res.cloudinary.com/maphorbs/image/upload/v1735101459/merry02.png" />
//               </body>
//             </html>
//           `,
//         },
//       })
//     );

//     await Promise.all(emailPromises);
//     console.log(`Batch ${Math.floor(i / batchSize) + 1} processed.`);

//     if (i + batchSize < emails.length) {
//       console.log("Waiting before processing the next batch...");
//       await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
//     }
//   }

//   console.log("All batches processed successfully.");
// }



// const functions = require("firebase-functions/v1");
// const admin = require("firebase-admin");

// admin.initializeApp();

// exports.sendChristmasGreetings = functions.https.onRequest(async (req, res) => {
//   try {
//     const firestore = admin.firestore();

//     // Define test email addresses
//     const testEmails = [
//       "oluwadamilare.alonge@gmail.com",
//       "shadrach.wigwe@certracker.com",
//     ];

//     // HTML email content with just the image
//     const htmlContent = `
//       <html>
//         <body>
//           <img src="https://res.cloudinary.com/maphorbs/image/upload/v1735101459/merry02.png" />
//         </body>
//       </html>
//     `;

//     // Prepare email sending promises (sending to Firestore collection 'mail')
//     const emailPromises = testEmails.map((email) =>
//       firestore.collection("mail").add({
//         to: [email],
//         message: {
//           subject: "Merry Christmas from CerTracker!",
//           html: htmlContent,
//         },
//       })
//     );

//     // Wait for all email promises to resolve
//     await Promise.all(emailPromises);

//     console.log("Test emails sent successfully.");
//     res.status(200).send("Test emails sent successfully.");
//   } catch (error) {
//     console.error("Error sending test emails:", error);
//     res.status(500).send("An error occurred while sending test emails.");
//   }
// });
