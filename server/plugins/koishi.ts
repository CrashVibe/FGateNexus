import { ChatBridge } from "../service/chatbridge/chatbridge";

export default defineNitroPlugin(() => {
    ChatBridge.getInstance();
});
