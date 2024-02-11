import fs from "fs";

export const loadCamps = (options) => {
  const fileString = fs.readFileSync("./data/2022-camps.json");
  let array = JSON.parse(fileString);

  if (options?.supportResumeFromIndex) {
    const resumeFromId = process.argv[2];
    if (resumeFromId) {
      const resumeFromIndex = array.findIndex(
        (camp) => camp.uid == resumeFromId
      );
      if (resumeFromIndex == -1) {
        console.error("resumeFromId not found", resumeFromId);
        return;
      }
      array = array.slice(resumeFromIndex);
    }
  }

  const entries = array.map((camp) => [camp.uid, camp]);

  return Object.fromEntries(entries);
};
