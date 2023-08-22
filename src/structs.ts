import {UserOperationStruct} from '@account-abstraction/contracts';

export interface AccountInfo {
  idType: 'mailto' | 'tel';
  account: string; // e.g. alice@gmail.com
  nameHash: string; // e.g. keccak256('mailto:alice@gmail.com');
  address: string;
  version: BigInt;
  primaryOwner: string;
  secondaryOwner?: string;
  primaryOwnerOutdated?: boolean;
  secondFactor?: {
    idType: string;
    account: string;
  };
}

export interface AccountAuth {
  primaryJwt?: string;
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
