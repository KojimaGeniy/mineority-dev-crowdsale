pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";

contract Whitelist is Pausable{

    mapping (address => bool) whitelisted;

  /**
     * @dev Throws if operator is not whitelisted.
     * @param _operator address
     */
    modifier onlyIfWhitelisted(address _operator) {
        require(whitelisted[_operator]);
        _;
    }

    /**
     * @dev getter to determine if address is in whitelist
     */
    function whitelist(address _operator)
      public
      view
      returns (bool)
    {
        return whitelisted[_operator];
    }

    /**
     * @dev add an address to the whitelist
     * @param _operator address
     * @return true if the address was added to the whitelist, false if the address was already in the whitelist
     */
    function addAddressToWhitelist(address _operator)
      public
      onlyOwner
    {
        whitelisted[_operator] = true;
    }

    /**
     * @dev add addresses to the whitelist
     * @param _operators addresses
     * @return true if at least one address was added to the whitelist,
     * false if all addresses were already in the whitelist
     */
    function addAddressesToWhitelist(address[] _operators)
      public
      onlyOwner
    {
        for (uint256 i = 0; i < _operators.length; i++) {
            whitelisted[_operators[i]] = true;
        }
    }

    /**
     * @dev remove an address from the whitelist
     * @param _operator address
     * @return true if the address was removed from the whitelist,
     * false if the address wasn't in the whitelist in the first place
     */
    function removeAddressFromWhitelist(address _operator)
      public
      onlyOwner
    {
        whitelisted[_operator] = false;
    }

    /**
     * @dev remove addresses from the whitelist
     * @param _operators addresses
     * @return true if at least one address was removed from the whitelist,
     * false if all addresses weren't in the whitelist in the first place
     */
    function removeAddressesFromWhitelist(address[] _operators)
      public
      onlyOwner
    {
        for (uint256 i = 0; i < _operators.length; i++) {
            whitelisted[_operators[i]] = false;
        }
    }
}
