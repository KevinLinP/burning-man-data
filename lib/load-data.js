import fs from "fs";

export const loadCamps = () => {
  const fileString = fs.readFileSync("./data/2022-camps.json");
  const array = JSON.parse(fileString);
  const entries = array.map((camp) => [camp.uid, camp]);

  return Object.fromEntries(entries);
};
