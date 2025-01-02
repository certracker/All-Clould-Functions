// const functions = require('firebase-functions');
// const admin = require('firebase-admin');

// admin.initializeApp();

// exports.sendNotificationAndEmailOnPhoneUpdate = functions.firestore.document('users/{userId}').onUpdate(async (change, context) => {
//     const oldData = change.before.data();
//     const newData = change.after.data();

//     // Check if phone number has been updated
//     if (oldData.phone !== newData.phone) {
//         const payload = {
//             notification: {
//                 title: 'Your phone number has been updated',
//                 body: `Your phone number has been updated from ${oldData.phone} to ${newData.phone}`,
//                 sound: 'default',
//                 channel_id: 'CerTracker',
//                 android_channel_id: 'CerTracker',
//                 priority: 'high'
//             }
//         };

//         try {
//             // Send notification to the user's device
//             await admin.messaging().sendToDevice(newData.fcmToken, payload);

//             // Add email document to the "mail" collection
//             const mailDocRef = await admin.firestore().collection('mail').add({
//                 to: [newData.email],
//                 message: {
//                     subject: 'Phone Number Update',
//                     text: `${oldData.phone} Your phone number has been updated to ${newData.phone}`,
//                     html: `
//     <p>We hope this message finds you well. We would like to inform you that a recent update has been made to your account information.</p>
//     <p>Your phone number has been successfully updated from ${oldData.phone} to ${newData.phone}.</p>
//     <p>Ensuring that your contact details are accurate is essential for us to provide you with seamless service and keep you informed about any important updates or notifications.</p>
//     <p>If you have any questions or concerns regarding this update, please do not hesitate to contact our customer support team. We are here to assist you in any way we can.</p>
//     <p>Thank you for your attention to this matter.</p>
// `
//                 }
//             });

//             console.log('Email document added with ID: ', mailDocRef.id);

//             // Add notification details to the "Notification" collection
//             await admin.firestore().collection('Notification').add({
//                 title: 'Phone Number Update',
//                 body: `We are pleased to inform you that your phone number has been successfully updated.

// Old Phone Number: ${oldData.phone}
// New Phone Number: ${newData.phone}

// Ensuring accurate contact details is crucial for us to deliver seamless service. Thank you for keeping your information up-to-date.

// If you have any questions or require further assistance, please feel free to contact our support team. We're here to help.`,

//                 category: 'CerTracker',
//                 read : false,
//                 userId: context.params.userId,
//                 timestamp: admin.firestore.FieldValue.serverTimestamp()
//             });

//             console.log('Notification added to Notification collection.');
//         } catch (error) {
//             console.error('Error sending notification or adding email/document/notification:', error);
//         }
//     }
// });






// const functions = require('firebase-functions');
// const admin = require('firebase-admin');

// admin.initializeApp();

// exports.checkDocumentExpiry = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
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
//                     message = `Your ${title} has expired ${daysExpired === 1 ? '1 day ago' : `${daysExpired} days ago`}.\nPlease renew it immediately to ensure compliance and \n- The CerTracker Team`;
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
//             htmlContent = `
//                 <p>Your ${title} has expired ${daysExpired === 1 ? '1 day ago' : `${daysExpired} days ago`} .</p>
//                 <p>Please renew it immediately to maintain compliance.</p>
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






const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.checkReminders = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
    try {
        const currentDateTime = new Date();

        const remindersSnapshot = await admin.firestore().collection('Reminder').where('dateTime', '<=', currentDateTime).get();

        remindersSnapshot.forEach(async (doc) => {
            const reminder = doc.data();
            const userId = reminder.userId;
            const reminderId = doc.id;

            // Retrieve user data to get FCM token and email
            const userDataDoc = await admin.firestore().collection('users').doc(userId).get();
            const userData = userDataDoc.data();
            const fcmToken = userData.fcmToken;
            const email = userData.email;

            // Send notification to the user's device
            const payload = {
                notification: {
                    title: 'Credential Reminder',
                    body: `The credential titled "${reminder.title}" reminder.`,
                }
            };

            // Send notification to user's device
            await admin.messaging().sendToDevice(fcmToken, payload);

            // Add notification details to the "Notification" collection
            await admin.firestore().collection('Notification').add({
                title: `${reminder.title} Reminder`,
                body: `This is a friendly reminder regarding your upcoming credential expiration. The credential titled "${reminder.title}" is set to expire soon.`,
                category: 'Reminder',
                read: false,
                userId: userId,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            // Add email document to the "mail" collection
            const mailDocRef = await admin.firestore().collection('mail').add({
                to: [email],
                message: {
                    subject: 'CerTracker Credential Reminder',
                    text: `${reminder.title} Reminder`,
                    html: `
                    <p>This is a friendly reminder regarding your upcoming credential expiration. The credential titled <b>"${reminder.title}"</b> is set to expire soon.</p>
                    <p>Ensuring that your credentials are up-to-date is essential for maintaining compliance and eligibility. We encourage you to take necessary actions to renew or update your credential before it expires.</p>
                    <p>If you have any questions or require assistance regarding the renewal process, please don't hesitate to reach out to our support team. We're here to help ensure a smooth and seamless renewal experience.</p>
                    <p>Thank you for your attention to this matter.</p>
                    <p>Best regards,</p>
                    <h3>CerTracker</h3>`

                }
            });

            console.log('Email document added with ID: ', mailDocRef.id);

            // Get the number of notifications sent for this reminder
            const reminderRef = admin.firestore().collection('Reminder').doc(reminderId);
            const reminderData = (await reminderRef.get()).data();
            const notificationsSent = reminderData.notificationsSent || 0;

            // Increment the count of notifications sent
            await reminderRef.update({ notificationsSent: notificationsSent + 1 });

            // If two notifications have been sent, delete the reminder
            if (notificationsSent + 1 === 2) {
                await reminderRef.delete();
                console.log('Reminder deleted:', reminderId);
            }
        });

        return null;
    } catch (error) {
        console.error('Error checking reminders:', error);
        return null;
    }
});















////// New

// const functions = require('firebase-functions');
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









const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Firebase Cloud Function to trigger on new user creation
exports.sendWelcomeEmailOnUserCreation = functions.auth.user().onCreate(async (user) => {
    try {
        const email = user.email;
        if (email) {
            const mailDocRef = await admin.firestore().collection('mail').add({
                to: [email],
                message: {
                    subject: 'Welcome to CerTracker!',
                    text: 'Thank you for creating an account with us!',
                    html: `
    <p>Dear ${user.email},</p>
    <p>We are thrilled to have you join our platform dedicated to helping professionals manage their credentials effectively and efficiently. At CerTracker, we understand the importance of staying organized and up-to-date with your certifications, licenses, and other credentials, and we're here to make that process seamless for you.</p>
    <p>Our user-friendly interface and robust features are designed to simplify credential management, allowing you to focus on what matters most—your professional growth and success.</p>
    <p>Whether you're a healthcare professional, educator, traveler, or any other professional requiring credential management, CerTracker is here to support you every step of the way.</p>
    <p>If you ever have any questions, need assistance, or simply want to share feedback, please don't hesitate to reach out to our dedicated support team. We're committed to providing you with exceptional service and ensuring your experience with CerTracker exceeds your expectations.</p>
    <p>Thank you for choosing CerTracker. We look forward to serving you and helping you achieve your credentialing goals.</p>
    <p>Best regards,</p>
    <p>The CerTracker Team</p>
`

                }
            });
            console.log('Welcome email document added with ID: ', mailDocRef.id);
        } else {
            console.error('User email not found.');
        }
    } catch (error) {
        console.error('Error adding welcome email document:', error);
    }
});