export const waitForTerminationSignal = () => {
  return new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      resolve();
    });
  });
};
