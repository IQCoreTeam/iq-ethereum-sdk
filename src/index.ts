import * as contract from "./contract";
import * as reader from "./sdk/reader";
import * as writer from "./sdk/writer";
import * as constants from "./sdk/constants";
import * as utils from "./sdk/utils";
import { setRpcUrl, getRpcUrl } from "./sdk/utils/provider";

export { contract, reader, writer, constants, utils, setRpcUrl, getRpcUrl };

const iqlabs = { contract, reader, writer, utils, constants, setRpcUrl, getRpcUrl };
export { iqlabs };
export default iqlabs;
