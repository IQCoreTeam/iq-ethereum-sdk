import { keccak256, toUtf8Bytes } from "ethers";

export function deriveDmSeed(userA: string, userB: string): string {
  const [sorted1, sorted2] = userA.toLowerCase() < userB.toLowerCase()
    ? [userA, userB]
    : [userB, userA];
  return keccak256(toUtf8Bytes(`${sorted1}:${sorted2}`));
}
