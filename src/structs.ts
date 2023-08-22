import {UserOperationStruct} from '@account-abstraction/contracts';

export interface AccountInfo {
  idType: 'mailto' | 'tel';
  account: string; // e.g. alice@gmail.com
  nameHash: string; // e.g. keccak256('mailto:alice@gmail.com');
  address: string;
  version: BigInt;
  auth: AccountAuth | null;
  secondFactor?: {
    idType: string;
    account: string;
  };
}

export interface AccountAuth {
  primaryOwner: string;
  primaryJwt?: string;
  primaryOwnerOutdated?: boolean;
  secondaryOwner?: string;
  secondaryJwt?: string;
  secondaryData?: any;
}

export interface UserOpInfo {
  userOp: UserOperationStruct;
  userOpHash: string;
  signType: number;
  validationData: number | string;
  signedMessage: string;
  primarySignature: string;
  secondarySignature?: string;
}
