pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./MultiSigEscrow.sol";
import "./Whitelist.sol";

contract Crowdsale is Whitelist{
    using SafeMath for uint256;
    
    enum ProjectStatus {
        InProgress,
        Funded,
        Refunded
    }

    struct Project {
        uint256 goal;
        uint256 weiRaised;
        string projectInfoHash;
        address multiSigEscrow;
        mapping(address => uint256) backerFunded;
        ProjectStatus status;
        uint256 closingTime;
    }

    Project[] internal allProjects;

    /// @dev Approved
    uint256[] public approvedProjects;

    event ProjectCreated(uint256 _projectId);
    event ProjectDeposited(uint256 _projectId, address _baker, uint256 _amount);
    event ProjectFunded(uint256 _projectId,uint256 _weiRaised);
    event ProjectRefunded(uint256 _projectId);


    modifier onlyWhileOpen(uint256 _projectId) {
        Project memory _project = allProjects[_projectId];
        require(block.timestamp <= _project.closingTime);
        _;
    }

    constructor() {

    }

    function createProject(
        uint256 _goal,
        string _projectInfoHash,
        address[] _escrow,
        uint256 _confirmationsNumber,
        uint256 _closingTime) public whenNotPaused onlyIfWhitelisted(msg.sender) /*ownerOnly*/
    {
        MultiSigEscrow instance = new MultiSigEscrow(_escrow,_confirmationsNumber);
        //It now stands for a year(365 days)(31536000 seconds)
        require(_closingTime < 183 days, "More than five years bro");

        Project memory _project = Project({
            goal: _goal,
            weiRaised: 0,
            projectInfoHash: _projectInfoHash,
            multiSigEscrow: address(instance),
            status: ProjectStatus.InProgress,
            closingTime: now + _closingTime
        });
        uint256 _projectId = allProjects.length;
        allProjects.push(_project); 


        emit ProjectCreated(_projectId);
    }

    function getProject(uint256 _projectId) public view returns(uint256,uint256,string,address,uint256) {
        Project memory _project = allProjects[_projectId];
        return(
            _project.goal,
            _project.weiRaised,
            _project.projectInfoHash,
            _project.multiSigEscrow,
            _project.closingTime
        );        
    }

    function getBakerFunds(uint256 _projectId, address _backer) public view returns(uint256) {
        Project storage _project = allProjects[_projectId];
        
        return _project.backerFunded[_backer];
    }

    /**
    * @dev Fund the chosen project, requires it to be open and not expired
      @param _projectId Contract creator.
    */
    function fundProject(uint256 _projectId) public payable onlyWhileOpen(_projectId) onlyIfWhitelisted(msg.sender) {
        // Check if this allocation is necessary for readability at least
        uint256 weiAmount = msg.value;

        require(weiAmount != 0);

        Project storage _project = allProjects[_projectId];
        require(_project.status == ProjectStatus.InProgress);

        // update state
        _project.weiRaised = _project.weiRaised.add(weiAmount);
        _project.backerFunded[msg.sender] = _project.backerFunded[msg.sender].add(weiAmount);
        MultiSigEscrow(_project.multiSigEscrow).deposit.value(msg.value)(msg.sender);
        emit ProjectDeposited(_projectId,msg.sender,weiAmount);
    }

    /**
    * @dev Investors can claim refunds here if crowdsale is unsuccessful
    */
    function claimRefund(uint256 _projectId) public {
        Project memory _project = allProjects[_projectId];

        require(_project.status == ProjectStatus.Refunded);

        MultiSigEscrow(_project.multiSigEscrow).withdraw(msg.sender);
    }

    /**
    * @dev Checks whether funding goal was reached.
    * @return Whether funding goal was reached
    */
    function goalReached(uint256 _projectId) public view returns (bool) {
        Project memory _project = allProjects[_projectId];
        return _project.weiRaised >= _project.goal;
    }

    /**
    * @dev Must be called after crowdsale ends, to do some extra finalization
    * work.
    */
    function finalize(uint256 _projectId) public onlyOwner {
        // Should be changed to owner of the project (?)
        // Better to be platform admin
        Project storage _project = allProjects[_projectId];

        // Check if they are checking for Finalization, it may not be needless
        require(_project.status == ProjectStatus.InProgress);

        if (goalReached(_projectId)) {
            _project.status = ProjectStatus.Funded; 
            MultiSigEscrow(_project.multiSigEscrow).close();
            emit ProjectFunded(_projectId, _project.weiRaised);

        } else {
            _project.status = ProjectStatus.Refunded;
            emit ProjectRefunded(_projectId);
            MultiSigEscrow(_project.multiSigEscrow).enableRefunds();
        }    
    }
}
