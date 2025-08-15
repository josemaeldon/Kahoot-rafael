Promise.resolve().then(() => {
  let o = {
    binaryType: "blob",

    bufferedAmount: 0,
    extensions: "",

    onclose: null,

    onerror: null,

    onmessage: null,

    onopen: null,

    protocol: "",

    readyState: 1,

    url: "ws://kahoot-server.cloudbr.app/ws",
  };
  console.log(o);
  o.bufferedAmount = 3;
});
