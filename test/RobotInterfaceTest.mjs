

import assert from 'assert';
import sinon from 'sinon';
import chai from 'chai';
import MockRobotConnection from "../src/MockRobotConnection.mjs";
import {DONE, QUEUED, WORKING} from "../src/CRCLCommandStatus.mjs";
import _ from "lodash";
import {CRCLCommand, CRCLCommandStatus, RobotInterface} from "../module.mjs";
import MockReorderedRobotConnection from "./MockReorderedRobotConnection.mjs";

const {expect} = chai;

export const TEST_QUEUEING_TIME = 10
export const TEST_WORKING_TIME = 50

describe('RobotInterfaceTest', function() {

    it('MockRobotConnection', async function() {
        const con = new MockRobotConnection('MockRobot', TEST_QUEUEING_TIME, TEST_WORKING_TIME)
        con.connect()
        const target1 = new CRCLCommand('MoveTo', 'Move to Con4Target', {"Straight":false,"Pose":{"X":680.54,"Y":500.0,"Z":-20.0,"A":0.0,"B":0.0,"C":0.0}});

        con.emit(con.name, target1.toJSON())
        con.on(con.name, console.log)

        await new Promise((resolve) => {
            setTimeout(() => resolve(), 1000)
        })

    });

    it('RobotInterfaceTest', async function() {
        const con = new MockRobotConnection('MockRobot', TEST_QUEUEING_TIME, TEST_WORKING_TIME)
        const ri = new RobotInterface(con)
        await ri.connect()

        const c1 = new CRCLCommand('SetEndEffector',"Picking0",{"Setting": 0.0})
        const c2 = new CRCLCommand('SetEndEffector',"Picking1",{"Setting": 1.0})

        let cmd = undefined;
        let status = undefined;

        let [queued1, working1, done1] = (ri.send(c1));
        ({cmd, status} = await queued1);
        expect(cmd).to.be.equal(c1);
        expect(status).to.be.deep.equal(new CRCLCommandStatus(QUEUED, c1.cid, 0));

        ({cmd, status} = await working1);
        expect(cmd).to.be.equal(c1);
        expect(status).to.be.deep.equal(new CRCLCommandStatus(WORKING, c1.cid, 1));

        ({cmd, status} = await done1);
        expect(cmd).to.be.equal(c1);
        expect(status).to.be.deep.equal(new CRCLCommandStatus(DONE, c1.cid, 2));

        let [queued2, working2, done2] = (ri.send(c2));
        ({cmd, status} = await queued2);
        expect(cmd).to.be.equal(c2);
        expect(status).to.be.deep.equal(new CRCLCommandStatus(QUEUED, c2.cid, 0));

        ({cmd, status} = await working2);
        expect(cmd).to.be.equal(c2);
        expect(status).to.be.deep.equal(new CRCLCommandStatus(WORKING, c2.cid, 1));

        ({cmd, status} = await done2);
        expect(cmd).to.be.equal(c2);
        expect(status).to.be.deep.equal(new CRCLCommandStatus(DONE, c2.cid, 2));

        ri.disconnect()
    });

    it('RobotInterfaceTest2', async function() {
        const con = new MockRobotConnection('MockRobot', TEST_QUEUEING_TIME, TEST_WORKING_TIME)
        const ri = new RobotInterface(con)
        await ri.connect()
        const commands = [...Array(10).keys()].map((i) => new CRCLCommand('SetEndEffector',"Picking"+i,{"Setting": 1.0}))
        const startTime = new Date().getTime();
        const promises = commands.map(cmd => ri.send(cmd))
        const times = promises.map(plist => plist.map(p => p.then(() => new Date().getTime() - startTime)))
        await promises[promises.length-1][2]
        console.log(times)

        const TIME_DELTA = 30
        for (const [queued, working, done] of times){
            expect(await queued).to.be.closeTo(TEST_QUEUEING_TIME,TIME_DELTA)
            expect(await done - await working).to.be.closeTo(TEST_WORKING_TIME,TIME_DELTA)
        }
        for (let i = 0; i<times.length-1; i++){
            const [queuedA, workingA, doneA] = times[i]
            const [queuedB, workingB, doneB] = times[i+1]
            expect(await workingA).to.be.at.most(await doneA)
            expect(await doneA).to.be.at.most(await workingB)
        }
        ri.disconnect()
    });

    it('BufferedRobotInterfaceTest', async function() {
        const con = new MockRobotConnection('MockRobot', TEST_QUEUEING_TIME, TEST_WORKING_TIME, true)
        const ri = new RobotInterface(con)
        await ri.connect()
        const commands = [...Array(10).keys()].map((i) => new CRCLCommand('SetEndEffector',"Picking"+i,{"Setting": 1.0}))

        const startTime = new Date().getTime();
        await ri.schedule(commands)

        console.log(con.times)

        const relTimes = _.mapValues(con.times,c => {
            return _.mapValues(c, (t) => t.getTime() - startTime);
        })

        console.log(relTimes)

        let cids = commands.map(cmd => cmd.cid)
        cids.pop()
        cids.forEach(ci => {
            const t1 = relTimes[ci]
            const t2 = relTimes[ci+1]

            expect(t1.received).to.be.at.most(t1.queued)
            expect(t1.queued).to.be.at.most(t1.working)
            expect(t1.working).to.be.at.most(t1.done)
            expect(t1.queued).to.be.at.most(t2.received)
            expect(t1.done).to.be.at.most(t2.working)
        })
        ri.disconnect()
    });

    it('ReorderedRobotInterfaceTest', async function() {
        const con = new MockReorderedRobotConnection('MockRobot', TEST_QUEUEING_TIME, TEST_WORKING_TIME)
        const ri = new RobotInterface(con)
        await ri.connect()

        const c1 = new CRCLCommand('SetEndEffector',"Picking0",{"Setting": 0.0})
        const c2 = new CRCLCommand('SetEndEffector',"Picking1",{"Setting": 1.0})

        let cmd = undefined;
        let status = undefined;

        let [queued1, working1, done1] = (ri.send(c1));
        ({cmd, status} = await queued1);
        expect(cmd).to.be.equal(c1);
        expect(status).to.be.deep.equal(new CRCLCommandStatus(QUEUED, c1.cid, 0));

        ({cmd, status} = await working1);
        expect(cmd).to.be.equal(c1);
        expect(status).to.be.deep.equal(new CRCLCommandStatus(WORKING, c1.cid, 1));

        ({cmd, status} = await done1);
        expect(cmd).to.be.equal(c1);
        expect(status).to.be.deep.equal(new CRCLCommandStatus(DONE, c1.cid, 2));

        let [queued2, working2, done2] = (ri.send(c2));
        ({cmd, status} = await queued2);
        expect(cmd).to.be.equal(c2);
        expect(status).to.be.deep.equal(new CRCLCommandStatus(QUEUED, c2.cid, 0));

        ({cmd, status} = await working2);
        expect(cmd).to.be.equal(c2);
        expect(status).to.be.deep.equal(new CRCLCommandStatus(WORKING, c2.cid, 1));

        ({cmd, status} = await done2);
        expect(cmd).to.be.equal(c2);
        expect(status).to.be.deep.equal(new CRCLCommandStatus(DONE, c2.cid, 2));

        ri.disconnect()
    });
});