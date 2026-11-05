"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_1 = require("../src/utils/jwt");
const maskData_1 = require("../src/utils/maskData");
const auth_1 = require("../src/middleware/auth");
const Template_1 = require("../src/models/Template");
const Campaign_1 = require("../src/models/Campaign");
const templateController_1 = require("../src/controllers/templateController");
const campaignController_1 = require("../src/controllers/campaignController");
describe('JWT Authentication & Token Security', () => {
    it('signs and verifies user authentication payload correctly', () => {
        const payload = {
            userId: 'user-123',
            schoolId: 'school-abc',
            role: 'admin',
            email: 'principal@school.edu',
        };
        const token = (0, jwt_1.generateAuthToken)(payload);
        expect(typeof token).toBe('string');
        const decoded = (0, jwt_1.verifyAuthToken)(token);
        expect(decoded.userId).toBe('user-123');
        expect(decoded.schoolId).toBe('school-abc');
        expect(decoded.role).toBe('admin');
        expect(decoded.email).toBe('principal@school.edu');
    });
    it('fails verification for tampered token', () => {
        expect(() => (0, jwt_1.verifyAuthToken)('invalid.token.here')).toThrow();
    });
});
describe('Privacy & Data Masking Utilities', () => {
    it('masks phone numbers to protect student privacy in audit logs', () => {
        expect((0, maskData_1.maskPhoneNumber)('+919876543210')).toBe('+9198 *** 10');
        expect((0, maskData_1.maskPhoneNumber)('9876543210')).toBe('98765 *** 10');
        expect((0, maskData_1.maskPhoneNumber)('')).toBe('N/A');
    });
    it('masks student names appropriately', () => {
        expect((0, maskData_1.maskStudentName)('Aarav Sharma')).toBe('Aarav S***');
        expect((0, maskData_1.maskStudentName)('Priya')).toBe('P***');
        expect((0, maskData_1.maskStudentName)('')).toBe('N/A');
    });
});
describe('Authentication & Role Middleware', () => {
    let mockReq;
    let mockRes;
    let nextFn;
    beforeEach(() => {
        mockReq = { headers: {} };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        nextFn = jest.fn();
    });
    it('rejects requests with missing Authorization header (401)', () => {
        (0, auth_1.authenticate)(mockReq, mockRes, nextFn);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(nextFn).not.toHaveBeenCalled();
    });
    it('rejects requests with malformed Bearer token (401)', () => {
        mockReq.headers = { authorization: 'Bearer malformed.bad.token' };
        (0, auth_1.authenticate)(mockReq, mockRes, nextFn);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(nextFn).not.toHaveBeenCalled();
    });
    it('authorizes request with valid JWT and populates req.user', () => {
        const token = (0, jwt_1.generateAuthToken)({
            userId: 'u1',
            schoolId: 's1',
            role: 'teacher',
            email: 'teacher@school.edu',
        });
        mockReq.headers = { authorization: `Bearer ${token}` };
        (0, auth_1.authenticate)(mockReq, mockRes, nextFn);
        expect(nextFn).toHaveBeenCalled();
        expect(mockReq.user).toBeDefined();
        expect(mockReq.user?.schoolId).toBe('s1');
    });
    it('enforces role permissions: blocks teacher from admin-only routes (403)', () => {
        mockReq.user = {
            userId: 'u1',
            schoolId: 's1',
            role: 'teacher',
            email: 'teacher@school.edu',
        };
        const adminOnly = (0, auth_1.requireRole)(['admin']);
        adminOnly(mockReq, mockRes, nextFn);
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(nextFn).not.toHaveBeenCalled();
    });
    it('enforces role permissions: allows admin on admin-only routes', () => {
        mockReq.user = {
            userId: 'u1',
            schoolId: 's1',
            role: 'admin',
            email: 'admin@school.edu',
        };
        const adminOnly = (0, auth_1.requireRole)(['admin']);
        adminOnly(mockReq, mockRes, nextFn);
        expect(nextFn).toHaveBeenCalled();
    });
});
describe('Multi-School Boundary & Tenant Isolation Queries', () => {
    let mockReq;
    let mockRes;
    beforeEach(() => {
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('strictly filters template queries by authenticated user schoolId', async () => {
        mockReq = {
            user: {
                userId: 'user-a',
                schoolId: 'school-A-id',
                role: 'teacher',
                email: 'teacher@schoola.edu',
            },
            query: {},
        };
        const sortMock = jest.fn().mockResolvedValue([
            { _id: 't1', name: 'School A Fee Reminder', schoolId: 'school-A-id' },
        ]);
        const findSpy = jest.spyOn(Template_1.Template, 'find').mockReturnValue({
            sort: sortMock,
        });
        await (0, templateController_1.listTemplates)(mockReq, mockRes);
        // Verify find was called strictly with schoolId: 'school-A-id'
        expect(findSpy).toHaveBeenCalledWith({ schoolId: 'school-A-id' });
        expect(mockRes.json).toHaveBeenCalledWith({
            templates: [
                { _id: 't1', name: 'School A Fee Reminder', schoolId: 'school-A-id' },
            ],
        });
    });
    it('blocks deletion of templates outside user school boundary (404)', async () => {
        mockReq = {
            user: {
                userId: 'user-b',
                schoolId: 'school-B-id',
                role: 'admin',
                email: 'admin@schoolb.edu',
            },
            params: { id: 'template-belonging-to-school-A' },
        };
        // When queried with { _id: templateA, schoolId: schoolB }, returns null
        jest.spyOn(Template_1.Template, 'findOneAndDelete').mockResolvedValue(null);
        await (0, templateController_1.deleteTemplate)(mockReq, mockRes);
        expect(Template_1.Template.findOneAndDelete).toHaveBeenCalledWith({
            _id: 'template-belonging-to-school-A',
            schoolId: 'school-B-id',
        });
        expect(mockRes.status).toHaveBeenCalledWith(404);
    });
    it('strictly filters campaign queries by authenticated schoolId', async () => {
        mockReq = {
            user: {
                userId: 'user-a',
                schoolId: 'school-A-id',
                role: 'teacher',
                email: 'teacher@schoola.edu',
            },
        };
        const sortMock = jest.fn().mockResolvedValue([]);
        const selectMock = jest.fn().mockReturnValue({ sort: sortMock });
        const findSpy = jest.spyOn(Campaign_1.Campaign, 'find').mockReturnValue({ select: selectMock });
        await (0, campaignController_1.listCampaigns)(mockReq, mockRes);
        expect(findSpy).toHaveBeenCalledWith({ schoolId: 'school-A-id' });
        expect(selectMock).toHaveBeenCalledWith('-recipients.renderedMessage');
    });
    it('blocks retrieving campaigns belonging to another school (404)', async () => {
        mockReq = {
            user: {
                userId: 'user-b',
                schoolId: 'school-B-id',
                role: 'teacher',
                email: 'teacher@schoolb.edu',
            },
            params: { id: 'campaign-from-school-A' },
        };
        jest.spyOn(Campaign_1.Campaign, 'findOne').mockResolvedValue(null);
        await (0, campaignController_1.getCampaignById)(mockReq, mockRes);
        expect(Campaign_1.Campaign.findOne).toHaveBeenCalledWith({
            _id: 'campaign-from-school-A',
            schoolId: 'school-B-id',
        });
        expect(mockRes.status).toHaveBeenCalledWith(404);
    });
});
