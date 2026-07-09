"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
exports.sendPushNotification = functions.firestore
    .document("push_notifications/{notificationId}")
    .onCreate(async (snapshot) => {
    const data = snapshot.data();
    if (!data)
        return;
    const { title, body, courseId } = data;
    try {
        let query;
        if (courseId === "all") {
            query = admin.firestore().collection("push_subscriptions");
        }
        else {
            query = admin.firestore()
                .collection("push_subscriptions")
                .where("courseId", "==", courseId);
        }
        const subscribers = await query.get();
        const tokens = [];
        subscribers.forEach((doc) => {
            const token = doc.data().token;
            if (token && !tokens.includes(token)) {
                tokens.push(token);
            }
        });
        if (tokens.length === 0) {
            console.log("No subscribers found for sending.");
            return;
        }
        const batchSize = 500;
        for (let i = 0; i < tokens.length; i += batchSize) {
            const batchTokens = tokens.slice(i, i + batchSize);
            const message = {
                notification: {
                    title: title,
                    body: body,
                    image: 'https://transitflow.org/pwa-icon.png'
                },
                webpush: {
                    notification: {
                        title: title,
                        body: body,
                        icon: 'https://transitflow.org/pwa-icon.png',
                        badge: 'https://transitflow.org/favicon.png',
                        image: 'https://transitflow.org/pwa-icon.png'
                    },
                    fcmOptions: {
                        link: 'https://transitflow.org/'
                    }
                },
                android: {
                    notification: {
                        icon: 'stock_white_24dp',
                        color: '#ff5252',
                        image: 'https://transitflow.org/pwa-icon.png'
                    }
                },
                tokens: batchTokens,
            };
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log(`Successfully sent ${response.successCount} notifications in batch ${i / batchSize + 1}`);
            if (response.failureCount > 0) {
                console.log(`Failed notifications in batch: ${response.failureCount}`);
            }
        }
    }
    catch (error) {
        console.error("Error broadcasting push notification:", error);
    }
});
//# sourceMappingURL=index.js.map