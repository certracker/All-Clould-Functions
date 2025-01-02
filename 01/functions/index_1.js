const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.checkDocumentExpiry = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    try {
        const firestore = admin.firestore();
        const tables = ['Certification', 'License', 'Others', 'Travel', 'Vaccination'];
        const notificationPromises = [];

        // Iterate through each table
        for (const table of tables) {
            // Retrieve all documents from the current table
            const documentsSnapshot = await firestore.collection(table).get();

            // Iterate through each document
            documentsSnapshot.forEach(async (doc) => {
                const data = doc.data();
                const expiryDate = new Date(data.ExpiryDate);
                const title = data.Title; // Assuming there's a field named "Title" in each document

                // Get today's date
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Calculate the difference in days
                const differenceInDays = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));

                // Check if the document is 30 days to expiry, 14 days to expiry, or expired
                let message = '';
                if (differenceInDays === 30) {
                    message = `This is a friendly reminder that your ${title} will expire in 30 days.\nPlease renew it immediately to ensure compliance and maintain eligibility.\n- The CerTracker Team`;
                } else if (differenceInDays === 14) {
                    message = `This is a friendly reminder that your ${title} will expire in 14 days.\nPlease renew it immediately to ensure compliance and maintain eligibility.\n- The CerTracker Team`;
                } else if (differenceInDays < 0) {
                    const daysExpired = Math.abs(differenceInDays);

                    // Check if the expired notification has been sent less than 3 times
                    const expiredNotificationCount = data.expiredNotificationCount || 0;

                    if (expiredNotificationCount < 3) {
                        if (expiredNotificationCount === 2) {
                            message = `Your ${title} has expired ${daysExpired === 1 ? '1 day ago' : `${daysExpired} days ago`}.\nThis is your final reminder to renew it immediately to ensure compliance.\n- The CerTracker Team`;
                        } else {
                            message = `Your ${title} has expired ${daysExpired === 1 ? '1 day ago' : `${daysExpired} days ago`}.\nPlease renew it immediately to ensure compliance.\n- The CerTracker Team`;
                        }

                        // Update the expired notification count in the document
                        await firestore.collection(table).doc(doc.id).update({
                            expiredNotificationCount: expiredNotificationCount + 1
                        });
                    }
                }

                if (message) {
                    // Retrieve user ID from the document
                    const userId = data.userId;

                    // Retrieve user data to get FCM token and email
                    const userDataDoc = await firestore.collection('users').doc(userId).get();
                    const userData = userDataDoc.data();
                    const fcmToken = userData.fcmToken;
                    const email = userData.email;

                    // Add promises for sending notifications to the array
                    notificationPromises.push(sendNotification(fcmToken, `${title} Exp. Reminder`, message));

                    // Add expired/soon-to-expire document details to the "mail" collection
                    await addMailDocument(firestore, email, `${title}`, message, differenceInDays);

                    // Add notification details to the "Notification" collection
                    await admin.firestore().collection('Notification').add({
                        title: `${title} Expiration Reminder`,
                        body: message,
                        category: `${table}`,
                        read: false,
                        userId: userId,
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            });
        }

        // Wait for all notification promises to resolve
        await Promise.all(notificationPromises);

        return null;
    } catch (error) {
        console.error('Error occurred:', error);
        throw new functions.https.HttpsError('unknown', 'An error occurred while checking document expiry.');
    }
});

async function sendNotification(fcmToken, title, body) {
    const message = {
        notification: {
            title: title,
            body: body
        },
        token: fcmToken
    };

    try {
        await admin.messaging().send(message);
        console.log('Notification sent successfully:', message);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

async function addMailDocument(firestore, email, title, text, differenceInDays) {
    try {
        let htmlContent = '';

        if (differenceInDays === 30) {
            htmlContent = `
                <p>This is a friendly reminder that your ${title} will expire in 30 days.</p>
                <p>Please ensure timely renewal to avoid any disruptions to your services or compliance requirements.</p>
                <p>If you have any questions or need assistance regarding the renewal process, feel free to contact our support team.</p>
                <p>Thank you for your attention to this matter.</p>
                <p>- The CerTracker Team</p>
            `;
        } else if (differenceInDays === 14) {
            htmlContent = `
                <p>This is a friendly reminder that your ${title} will expire in 14 days.</p>
                <p>Please ensure timely renewal to avoid any disruptions to your services or compliance requirements.</p>
                <p>If you have any questions or need assistance regarding the renewal process, feel free to contact our support team.</p>
                <p>Thank you for your attention to this matter.</p>
                <p>- The CerTracker Team</p>
            `;
        } else if (differenceInDays < 0) {
            const daysExpired = Math.abs(differenceInDays);
            const isFinalReminder = differenceInDays === 2;

            htmlContent = `
                <p>Your ${title} has expired ${daysExpired === 1 ? '1 day ago' : `${daysExpired} days ago`}.</p>
                <p>${isFinalReminder ? 'This is your final reminder to renew it immediately to ensure compliance.' : 'Please renew it immediately to maintain compliance.'}</p>
                <p>If you have any questions or need assistance regarding the renewal process, feel free to contact our support team.</p>
                <p>Thank you for your attention to this matter.</p>
                <p>- The CerTracker Team</p>
            `;
        } else {
            htmlContent = `
                <p>${text}</p>
                <p>Please ensure timely renewal to avoid any disruptions to your services or compliance requirements.</p>
                <p>If you have any questions or need assistance regarding the renewal process, feel free to contact our support team.</p>
                <p>Thank you for your attention to this matter.</p>
                <p>- The CerTracker Team</p>
            `;
        }

        // Add document to the "mail" collection with HTML content
        await firestore.collection('mail').add({
            to: [email],
            message: {
                subject: `${title} Expiration Reminder`,
                text: text, // Plain text content for compatibility
                html: htmlContent
            }
        });

        console.log('Mail document added successfully.');
    } catch (error) {
        console.error('Error adding mail document:', error);
    }
}
