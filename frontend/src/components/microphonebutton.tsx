import MicRecorder from "./MicRecorder";

export default function Page() {
  return (
    <div>
      <h2>Message composer</h2>
      <MicRecorder
        preferDemo={false}
        onStop={async (blob, url, ext) => {
          console.log("Recorded:", blob, url, ext);
          // e.g. upload(blob)
        }}
      />
    </div>
  );
}
