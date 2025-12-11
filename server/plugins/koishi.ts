import { ChatBridge } from "../service/chatbridge/chatbridge";

export default defineNitroPlugin(async () => {
    ChatBridge.getInstance();
});
