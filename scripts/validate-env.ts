import { validateArtureEnvironment } from "../src/lib/env";
const environment = validateArtureEnvironment();
console.log(`Arture configuration valid for ${environment.mongodbDatabase}; collections use the arture_ prefix.`);
