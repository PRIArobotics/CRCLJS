import _ from 'lodash'
import CRCLCommand from "./CRCLCommand.mjs";

function Command(cmd, name, param, cid){
    return new CRCLCommand(cmd, name, param, cid)
}

function MoveTo(name, position, rotation, straight) {
    if (straight === undefined) straight = false;
    const poseMatrix = {
        "X": position[0],
        "Y": position[1],
        "Z": position[2],
        "A": rotation[0],
        "B": rotation[1],
        "C": rotation[2],
    }
    return Command("MoveTo", name, {"Straight": straight, "Pose": poseMatrix});
}

function SetEndEffector(name, setting) {
    return Command("SetEndEffector", name, {"Setting" : setting});
}

function SetEndEffectorParameters(name, toolid) {
    return Command("SetEndEffectorParameters", name, {"ToolID" : toolid});
}

function Wait(name, time) {
    return Command("Wait", name, {"Time" : time});
}

function SetTransSpeed(name, relative) {
    return Command("SetTransSpeed", name, {"Relative" : relative});
}

function SetTransAccel(name, relative) {
    return Command("SetTransAccel", name, {"Relative" : relative});
}

const CommandFactory = {
    Command,
    MoveTo,
    SetEndEffector,
    SetEndEffectorParameters,
    Wait,
    SetTransSpeed,
    SetTransAccel,
};

export default CommandFactory;

