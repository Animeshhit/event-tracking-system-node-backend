import app from "./app";
import {PORT} from "./env";
import "./src/workers/event.worker";


app.listen(PORT,() => {
    console.log(`server is running on port ${PORT}`);
})