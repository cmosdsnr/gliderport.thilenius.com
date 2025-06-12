
const server = import.meta.env.VITE_SERVER_URL.toString()
const origin = window.location.origin;


export let serverUrl = import.meta.env.VITE_SERVER_URL.toString();
export let socketUrl = import.meta.env.VITE_SOCKET_SERVER_URL.toString();
export let pbUrl = import.meta.env.VITE_PB_URL.toString();
export let pageName = import.meta.env.VITE_PAGE_NAME.toString();

// if origin is in server, use server URL
if (!origin.includes(server)) {
    console.log("Using reverse proxy");
    serverUrl = import.meta.env.VITE_PROXY_SERVER_URL.toString();
    socketUrl = import.meta.env.VITE_PROXY_SOCKET_SERVER_URL.toString();
    pbUrl = import.meta.env.VITE_PROXY_PB_URL.toString();
    pageName = "local gliderport";
}

console.log("Server URL: ", serverUrl);
console.log("Socket URL: ", socketUrl);
console.log("PB URL: ", pbUrl);
console.log("Page Name: ", pageName);