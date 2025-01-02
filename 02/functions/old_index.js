const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

admin.initializeApp();

exports.checkDocumentExpiry = functions.pubsub.schedule('every 24 hours').onRun(async () => {
    try {
        const firestore = admin.firestore();
        const tables = ['Certification', 'License', 'Others', 'Travel', 'Vaccination'];
        const notificationPromises = [];

        for (const table of tables) {
            const documentsSnapshot = await firestore.collection(table).get();

            for (const doc of documentsSnapshot.docs) {
                const data = doc.data();
                const expiryDate = new Date(data.ExpiryDate);

                if (!expiryDate) continue;

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const differenceInDays = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
                const expiredNotificationCount = data.expiredNotificationCount || 0;

                let message = '';
                if (differenceInDays === 30) {
                    message = `This is a friendly reminder that your ${data.Title} will expire in 30 days. Please renew it to ensure compliance.`;
                } else if (differenceInDays === 14) {
                    message = `This is a friendly reminder that your ${data.Title} will expire in 14 days. Please renew it to ensure compliance.`;
                } else if (differenceInDays < 0 && expiredNotificationCount < 3) {
                    const daysExpired = Math.abs(differenceInDays);
                    message = expiredNotificationCount === 2
                        ? `Your ${data.Title} expired ${daysExpired === 1 ? '1 day ago' : `${daysExpired} days ago`}. This is your last and final reminder to renew this expired document.`
                        : `Your ${data.Title} expired ${daysExpired === 1 ? '1 day ago' : `${daysExpired} days ago`}. Please renew it to ensure compliance.`;

                    await firestore.collection(table).doc(doc.id).update({
                        expiredNotificationCount: expiredNotificationCount + 1,
                    });
                }

                if (message) {
                    const userSnapshot = await firestore.collection('users').doc(data.userId).get();
                    if (!userSnapshot.exists) continue;

                    const userData = userSnapshot.data();
                    const fcmToken = userData.fcmToken;
                    const email = userData.email;

                    if (fcmToken) {
                        notificationPromises.push(sendNotification(fcmToken, `${data.Title} Exp. Reminder`, message));
                    }

                    await addMailDocument(firestore, email, data.Title, message, differenceInDays);
                    await firestore.collection('Notification').add({
                        title: `${data.Title} Expiration Reminder`,
                        body: message,
                        category: table,
                        read: false,
                        userId: data.userId,
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
            }
        }

        await Promise.all(notificationPromises);

        console.log('Document expiry check completed successfully.');
        return null;
    } catch (error) {
        console.error('Error occurred while checking document expiry:', error);
        throw new functions.https.HttpsError('unknown', 'An error occurred while checking document expiry.');
    }
});

async function sendNotification(fcmToken, title, body) {
    const message = {
        notification: {
            title,
            body,
        },
        token: fcmToken,
    };

    try {
        await admin.messaging().send(message);
        console.log('Notification sent successfully:', title);
    } catch (error) {
        console.error('Error sending notification:', error);
        if (error.code === 'messaging/invalid-registration-token') {
            console.error('Invalid FCM token, skipping.');
        }
    }
}

async function addMailDocument(firestore, email, title, text, differenceInDays) {
    try {
        const daysNotice = differenceInDays > 0
            ? `Your ${title} will expire in ${differenceInDays} days.`
            : `Your ${title} expired ${Math.abs(differenceInDays)} days ago.`;

        const htmlContent = `
            <p>${daysNotice}</p>
            <p>Please ensure timely renewal to avoid disruptions or compliance issues.</p>
            <p>If you need assistance, contact our support team.</p>
            <p>- The CerTracker Team</p>
        `;

        await firestore.collection('mail').add({
            to: [email],
            message: {
                subject: `${title} Expiration Reminder`,
                text,
                html: htmlContent,
            },
        });

        console.log('Mail document added successfully for:', email);
    } catch (error) {
        console.error('Error adding mail document:', error);
    }
}






// const functions = require('firebase-functions/v1');
// const admin = require('firebase-admin');

// admin.initializeApp();

// exports.checkReminders = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
//     try {
//         const currentDateTime = admin.firestore.Timestamp.fromDate(new Date());
//         const remindersSnapshot = await admin.firestore()
//             .collection('Reminder')
//             .where('dateTime', '<=', currentDateTime)
//             .get();

//         for (const doc of remindersSnapshot.docs) {
//             const reminder = doc.data();
//             const userId = reminder.userId;
//             const reminderId = doc.id;

//             try {
//                 // Retrieve user data
//                 const userDataDoc = await admin.firestore().collection('users').doc(userId).get();
//                 if (!userDataDoc.exists) {
//                     console.error(`User document not found for userId: ${userId}`);
//                     continue;
//                 }

//                 const userData = userDataDoc.data();
//                 const fcmToken = userData.fcmToken;
//                 const email = userData.email;

//                 // Prepare the notification message
//                 const message = {
//                     token: fcmToken,
//                     notification: {
//                         title: 'Credential Reminder',
//                         body: `The credential titled "${reminder.title}" is due soon.`,
//                     },
//                     data: {
//                         title: 'Credential Reminder',
//                         body: `The credential titled "${reminder.title}" is due soon.`,
//                     },
//                 };

//                 // Send the notification
//                 try {
//                     await admin.messaging().send(message);
//                     console.log(`Notification sent to device with token: ${fcmToken}`);
//                 } catch (error) {
//                     console.error(`Error sending notification to userId: ${userId}`, error);
//                 }

//                 // Add to "Notification" collection
//                 await admin.firestore().collection('Notification').add({
//                     title: `${reminder.title} Reminder`,
//                     body: `This is a friendly reminder regarding your upcoming credential expiration.`,
//                     category: 'Reminder',
//                     read: false,
//                     userId: userId,
//                     timestamp: admin.firestore.FieldValue.serverTimestamp(),
//                 });

//                 // Add to "mail" collection
//                 await admin.firestore().collection('mail').add({
//                     to: [email],
//                     message: {
//                         subject: 'CerTracker Credential Reminder',
//                         text: `${reminder.title} Reminder`,
//                         html: `
//                             <p>This is a friendly reminder regarding your upcoming credential expiration. The credential titled <b>"${reminder.title}"</b> is set to expire soon.</p>
//                             <p>Ensuring that your credentials are up-to-date is essential for maintaining compliance and eligibility. We encourage you to take necessary actions to renew or update your credential before it expires.</p>
//                             <p>If you have any questions or require assistance regarding the renewal process, please don't hesitate to reach out to our support team. We're here to help ensure a smooth and seamless renewal experience.</p>
//                             <p>Thank you for your attention to this matter.</p>
//                             <p>Best regards,</p>
//                             <h3>CerTracker</h3>`
//                     },
//                 });

//                 console.log('Email sent to:', email);

//                 // Update reminder and delete if necessary
//                 const reminderRef = admin.firestore().collection('Reminder').doc(reminderId);
//                 const reminderData = (await reminderRef.get()).data();
//                 const notificationsSent = reminderData.notificationsSent || 0;

//                 const newNotificationsSent = notificationsSent + 1;
//                 await reminderRef.update({ notificationsSent: newNotificationsSent });

//                 if (newNotificationsSent === 2) {
//                     await reminderRef.delete();
//                     console.log('Reminder deleted:', reminderId);
//                 }
//             } catch (error) {
//                 console.error(`Error processing reminder ${reminderId}:`, error);
//             }
//         }

//         return null;
//     } catch (error) {
//         console.error('Error checking reminders:', error);
//         return null;
//     }
// });







// const functions = require('firebase-functions/v1');
// const admin = require('firebase-admin');

// admin.initializeApp();

// // Firebase Cloud Function to trigger on new user creation
// exports.sendWelcomeEmailOnUserCreation = functions.auth.user().onCreate(async (user) => {
//     try {
//         const email = user.email;
//         if (email) {
//             const mailDocRef = await admin.firestore().collection('mail').add({
//                 to: [email],
//                 message: {
//                     subject: 'Welcome to CerTracker!',
//                     text: 'Thank you for creating an account with us!',
//                     html: `
//                     <div style="font-family: Arial, sans-serif; color: #000000">
//                       <div
//                         style="
//                           max-width: 600px;
//                           margin: 0 auto;
//                           padding: 20px;
//                           background-color: #ffffff;
//                           border: 1px solid #ddd;
//                         "
//                       >
//                         <p style="font-size: 16px; line-height: 1.6; margin-top: 20px">
//                           Dear ${user.email},
//                         </p>

//                         <h1 style="color: #000000; text-align: center; font-size: 36px">
//                           Welcome!
//                         </h1>

//                         <h3
//                           style="
//                             color: #000000;
//                             text-align: center;
//                             font-family: 'Brush Script MT', cursive;
//                             font-size: 24px;
//                           "
//                         >
//                           We’re so happy you’re here!
//                         </h3>

//                         <div>
//                           <img
//                             src="https://res.cloudinary.com/maphorbs/image/upload/v1730628591/mail%20banner.png"
//                             alt="CerTracker"
//                             width="600px"
//                           />
//                         </div>

//                         <p
//                           style="
//                             font-size: 16px;
//                             text-align: center;
//                             margin-top: 20px;
//                             margin-bottom: 20px;
//                             width: 80%;
//                             margin-left: auto;
//                             margin-right: auto;
//                             color: #000000;
//                           "
//                         >
//                           Thanks for joining us here at CerTracker! We are dedicated to helping
//                           healthcare professionals manage their credentials effectively and
//                           efficiently!
//                         </p>

//                         <!-- New Container with Purple Background -->
//                         <div
//                           style="
//                             display: flex;
//                             flex-direction: row;
//                             background-color: #e2caed;
//                             padding: 20px;
//                             color: #000000;
//                             margin-top: 20px;
//                             border-radius: 8px;
//                           "
//                         >
//                           <!-- Left Section -->
//                           <div style="flex: 1; padding-right: 10px">
//                             <h3 style="margin-top: 0">WHERE TO START</h3>
//                             <ul style="padding-left: 20px; margin: 0">
//                               <li style="margin-bottom: 10px">
//                                 <strong>Set up your profile</strong> - begin by adding your
//                                 credentials, certifications, and CE credits
//                               </li>
//                               <li>
//                                 <strong>Explore features</strong> - dive into tracking tools,
//                                 expiration reminders, and more to keep credentials up-to-date
//                               </li>
//                             </ul>

//                             <h3 style="margin-top: 20px">WE VALUE YOUR FEEDBACK</h3>
//                             <p>
//                               Your experience matters to us! Let us know what you think of
//                               CerTracker - Your feedback helps us make the platform even better
//                               for you!
//                             </p>
//                           </div>

//                           <!-- Right Section -->
//                           <div style="flex: 1; padding-left: 10px; text-align: center">
//                             <img
//                               src="https://res.cloudinary.com/maphorbs/image/upload/v1730629798/nursewithdog.png"
//                               alt="Credential Management"
//                               style="
//                                 width: 100%;
//                                 max-width: 950px;
//                                 border-radius: 8px;
//                                 margin-bottom: 10px;
//                                 margin-left: 50px;
//                               "
//                             />
//                             <p
//                               style="
//                                 font-size: 16px;
//                                 line-height: 1.6;
//                                 text-align: center;
//                                 color: #000000;
//                               "
//                             >
//                               Devin Patterson BSN,RN,CEN<br />
//                               Founder, COO
//                               <br />
//                               <strong>So happy you are here!</strong>
//                             </p>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                     `
//                 }
//             });
//             console.log('Welcome email document added with ID: ', mailDocRef.id);
//         } else {
//             console.error('User email not found.');
//         }
//     } catch (error) {
//         console.error('Error adding welcome email document:', error);
//     }
// });


// const functions = require("firebase-functions");
// const admin = require("firebase-admin");
// const express = require("express");
// const app = express();

// // Initialize Firebase Admin
// admin.initializeApp();

// // Middleware to parse JSON
// app.use(express.json());

// // Webhook endpoint to receive OCR results
// app.post("/analysis-result", (req, res) => {
//   const { category, summary, result, user, id } = req.body; // Destructure `id` here

//   console.log("Payload received:", req.body);

//   // Validate payload
//   if (!result || !user || !id) { // Validate that `id` is also present
//     console.error("Invalid payload:", req.body);
//     return res.status(400).send("Invalid data received");
//   }

//   const db = admin.firestore();

//   // Store the result in the structure: analysisResults/{autoGeneratedDocId}
//   db.collection("analysisResults") // Main collection
//     .add({
//       user,
//       category,
//       summary,
//       result,
//       timestamp: new Date().toISOString(),
//       id, // Save the id here
//     })
//     .then((docRef) => {
//       console.log(`Data stored successfully. Document ID: ${docRef.id}`);
//       res.status(200).send("Result received and stored.");
//     })
//     .catch((error) => {
//       console.error("Error storing result:", error);
//       res.status(500).send("Error storing result.");
//     });
// });

// // Export the function to Firebase
// exports.api = functions.https.onRequest(app);
