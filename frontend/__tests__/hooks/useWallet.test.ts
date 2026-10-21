import { renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useWallet, WalletProvider, UserRejectedError } from "@/hooks/useWallet";
import { NETWORK_PASSPHRASE } from "@/lib/stellar";

const mockKit = {
  openModal: jest.fn(),
  setWallet: jest.fn(),
  getAddress: jest.fn(),
  getNetwork: jest.fn(),
  signTransaction: jest.fn(),
  signMessage: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock("@/lib/walletKit", () => ({
  getWalletKit: () => mockKit,
  readLastWalletId: jest.fn(() => null),
  persistLastWalletId: jest.fn(),
}));

describe("useWallet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mockKit.getNetwork.mockResolvedValue({ network: "TESTNET", networkPassphrase: NETWORK_PASSPHRASE });
    mockKit.openModal.mockImplementation(({ onWalletSelected }: { onWalletSelected: (opt: { id: string }) => Promise<void> }) => {
      void onWalletSelected({ id: "freighter" });
    });
  });

  it("throws when rendered outside of WalletProvider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useWallet())).toThrow(
      "useWallet must be used within a WalletProvider"
    );
    spy.mockRestore();
  });

  describe("when wallet is not installed or access fails", () => {
    it("sets walletNotInstalled to true when getAddress returns empty", async () => {
      mockKit.getAddress.mockResolvedValue({ address: "" });

      const { result } = renderHook(() => useWallet(), { wrapper: WalletProvider });

      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.walletNotInstalled).toBe(true);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.address).toBeNull();
    });

    it("sets walletNotInstalled to true when wallet throws", async () => {
      mockKit.getAddress.mockRejectedValue(new Error("Extension not found"));

      const { result } = renderHook(() => useWallet(), { wrapper: WalletProvider });

      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.walletNotInstalled).toBe(true);
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe("when wallet is installed and access is granted", () => {
    const TEST_ADDRESS = "GABCDE1234567890ABCDE1234567890ABCDE1234567890ABCDE12";

    beforeEach(() => {
      mockKit.getAddress.mockResolvedValue({ address: TEST_ADDRESS });
    });

    it("sets address, isConnected and network on successful connect", async () => {
      const { result } = renderHook(() => useWallet(), { wrapper: WalletProvider });

      await act(async () => {
        await result.current.connect();
      });

      expect(mockKit.setWallet).toHaveBeenCalledWith("freighter");
      expect(result.current.address).toBe(TEST_ADDRESS);
      expect(result.current.isConnected).toBe(true);
      expect(result.current.walletNotInstalled).toBe(false);
      expect(result.current.networkPassphrase).toBe(NETWORK_PASSPHRASE);
      expect(result.current.isNetworkMismatched).toBe(false);
    });

    it("clears address and connected state on disconnect", async () => {
      const { result } = renderHook(() => useWallet(), { wrapper: WalletProvider });

      await act(async () => {
        await result.current.connect();
      });

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.address).toBeNull();
      expect(result.current.isConnected).toBe(false);
    });

    it("signs a transaction with the connected address and network", async () => {
      mockKit.signTransaction.mockResolvedValue({ signedTxXdr: "signed-xdr" });

      const { result } = renderHook(() => useWallet(), { wrapper: WalletProvider });

      await act(async () => {
        await result.current.connect();
      });

      await expect(result.current.signTransaction("unsigned-xdr")).resolves.toBe("signed-xdr");
      expect(mockKit.signTransaction).toHaveBeenCalledWith("unsigned-xdr", {
        networkPassphrase: NETWORK_PASSPHRASE,
        address: TEST_ADDRESS,
      });
    });

    it("maps a rejected signTransaction promise to UserRejectedError", async () => {
      mockKit.signTransaction.mockRejectedValue(new Error("User rejected the request"));

      const { result } = renderHook(() => useWallet(), { wrapper: WalletProvider });

      await act(async () => {
        await result.current.connect();
      });

      await expect(result.current.signTransaction("unsigned-xdr")).rejects.toBeInstanceOf(UserRejectedError);
    });

    it("signs a message and maps user decline to UserRejectedError", async () => {
      mockKit.signMessage.mockResolvedValueOnce({ signedMessage: "sig-123" });

      const { result } = renderHook(() => useWallet(), { wrapper: WalletProvider });

      await act(async () => {
        await result.current.connect();
      });

      await expect(result.current.signMessage("hello")).resolves.toBe("sig-123");

      mockKit.signMessage.mockRejectedValueOnce(new Error("User declined"));
      await expect(result.current.signMessage("hello")).rejects.toBeInstanceOf(UserRejectedError);
    });
  });

  it("throws when signing without a connected wallet", async () => {
    const { result } = renderHook(() => useWallet(), { wrapper: WalletProvider });

    await expect(result.current.signTransaction("unsigned-xdr")).rejects.toThrow("Wallet not connected");
    expect(mockKit.signTransaction).not.toHaveBeenCalled();
  });
});
