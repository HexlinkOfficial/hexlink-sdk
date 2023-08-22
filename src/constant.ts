import ERC20_ABI from './abi/ERC20_ABI.json';
import {ethers} from 'ethers';

export const HEXLINK = '0xFE6Ff79B588CF2D97c4f7F6d1A52bBe0A5ECd71E';

export const DAUTH_VALIDATOR = '0xf3b4e49Fd77A959B704f6a045eeA92bd55b3b571';

export const HEXLINK_VALIDATOR = '0x943fabe0d1ae7130fc48cf2abc85f01fc987ec81';

export const DAUTH_BASE_URL = process.env.DAUTH_BASE_URL || '';
export const DAUTH_CLEINT_ID = process.env.DAUTH_CLIENT_ID || '';
export const HEXLINK_BASE_URL = process.env.HEXLINK_SERVER_URL || '';

export const DUMMY_SIGNATURE =
  '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c';

export const ENTRYPOINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

export const ERC20_IFACE = new ethers.Interface(ERC20_ABI);
