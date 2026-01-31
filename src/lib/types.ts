import { Timestamp } from "firebase/firestore";

export interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Timestamp;
}
