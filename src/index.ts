import * as contract from "./contract";
import * as reader from "./sdk/reader";
import * as writer from "./sdk/writer";
import * as crypto from "./sdk/crypto";
import * as constants from "./sdk/constants";
import * as utils from "./sdk/utils";
import {
  setRpcUrl,
  getRpcUrl,
  setNetwork,
  getNetwork,
  assertChainMatches,
} from "./sdk/utils/provider";

export {
  contract,
  reader,
  writer,
  crypto,
  constants,
  utils,
  setRpcUrl,
  getRpcUrl,
  setNetwork,
  getNetwork,
  assertChainMatches,
};

const iqlabs = {
  contract,
  reader,
  writer,
  crypto,
  utils,
  constants,
  setRpcUrl,
  getRpcUrl,
  setNetwork,
  getNetwork,
  assertChainMatches,
};
export { iqlabs };
export default iqlabs;
