import { ethers } from "ethers";

export const roles = {
    admin: "0x0000000000000000000000000000000000000000000000000000000000000000",
    upgrader: ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE")), 
    pauser: ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE")),
    system: ethers.keccak256(ethers.toUtf8Bytes("SYSTEM_ROLE")),
    approver: ethers.keccak256(ethers.toUtf8Bytes("APPROVER_ROLE")),
    vault: ethers.keccak256(ethers.toUtf8Bytes("VAULT_ROLE")),
};

export const addresses = {
    zeroAddress: "0x0000000000000000000000000000000000000000"
}

export const paymentStates = {
    none: 0,
    placed: 1,
    approved: 2
}

export const interfaceIds = {
    IERC2981: "0x2a55205a",
    IERC165: "0x01ffc9a7",
    IAccessControl: "0x7965db0b",
    IERC721: "0x80ac58cd",
    IERC721Enumerable: "0x780e9d63",
    IERC20: "0x36372b07",
    IERC20Metadata: "0xa219a025",
    IERC777: "0xe58e113c"
}; 

export const errorMessages = {
    OWNER_ONLY: "Ownable: caller is not the owner",
    PAUSED: "Pausable: paused",
    NOT_PAUSED: "Pausable: not paused",
    TRANSFER_WHEN_PAUSED: "ERC721Pausable: token transfer while paused",
    TRANSFER_NOT_OWNER: "ERC721: caller is not token owner or approved",
    ACCESS_CONTROL: "AccessControl:",
    LOWLEVEL_DELEGATE_CALL: "Address: low-level delegate call failed",
    FUNCTION_NOT_RECOGNIZED: "Transaction reverted without a reason string",
    CUSTOM_ACCESS_CONTROL: (arg1: string, arg2: string) => "UnauthorizedAccess", //TODO: why won't args work? (arg1: string, arg2: string) => `UnauthorizedAccess("${arg1}", "${arg2}")`,
    ACCESS_CONTROL_RENOUNCE: "AccessControl: can only renounce roles for self",
    CONTRACT_ALREADY_INITIALIZED: "Initializable: contract is already initialized",
    ZERO_ADDRESS: "ZeroAddressArgument",
    ZERO_VALUE: "ZeroValueArgument",
    FIELD_NOT_FOUND: "FieldNotFound",
    UNAUTHORIZED_ACCESS: "UnauthorizedAccess",
    INVALID_CONTRACT_METHOD: "Transaction reverted without a reason string",
    NOT_NFT_OWNER: (callerAddr: string, nftAddr: string) => "CallerNotNftOwner",
    NFT_INSTANCE_UNAVAILABLE: (nftAddr: string, tokenId: number) => "NftInstanceUnavailable",
    INSUFFICIENT_PAYMENT: (expected: number, actual: number) => "InsufficientPayment",
    INVALID_ACTION: "InvalidAction",
}