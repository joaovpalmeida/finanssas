
export interface EncryptedData {
  encrypted: true;
  salt: Uint8Array;
  iv: Uint8Array;
  content: ArrayBuffer;
}

const getPasswordKey = (password: string) => 
  window.crypto.subtle.importKey(
    "raw", 
    new TextEncoder().encode(password), 
    "PBKDF2", 
    false, 
    ["deriveKey"]
  );

const deriveKey = async (passwordKey: CryptoKey, salt: Uint8Array, keyUsage: ["encrypt"] | ["decrypt"]) => 
  window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    keyUsage
  );

export const encryptDatabase = async (data: Uint8Array, password: string): Promise<EncryptedData> => {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const passwordKey = await getPasswordKey(password);
  const aesKey = await deriveKey(passwordKey, salt, ["encrypt"]);
  
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    data
  );

  return {
    encrypted: true,
    salt,
    iv,
    content: encryptedContent
  };
};

export const decryptDatabase = async (encryptedData: EncryptedData, password: string): Promise<Uint8Array> => {
  try {
    const passwordKey = await getPasswordKey(password);
    const aesKey = await deriveKey(passwordKey, encryptedData.salt, ["decrypt"]);
    
    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: encryptedData.iv },
      aesKey,
      encryptedData.content
    );
    
    return new Uint8Array(decryptedContent);
  } catch (e) {
    throw new Error("Incorrect password or corrupted data");
  }
};
