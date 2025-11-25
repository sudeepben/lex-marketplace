// apps/web/lib/storage.ts
import { app } from "./firebase";          // <-- use your initialized app
import { getStorage } from "firebase/storage";

export const storage = getStorage(app);
