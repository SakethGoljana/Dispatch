import { generateAuthToken, verifyAuthToken } from '../src/utils/jwt';
import { maskPhoneNumber, maskStudentName } from '../src/utils/maskData';
import { authenticate, requireRole } from '../src/middleware/auth';
import { Request, Response } from 'express';
import { Template } from '../src/models/Template';
import { Campaign } from '../src/models/Campaign';
import { listTemplates, deleteTemplate } from '../src/controllers/templateController';
import { listCampaigns, getCampaignById } from '../src/controllers/campaignController';

describe('JWT Authentication & Token Security', () => {
  it('signs and verifies user authentication payload correctly', () => {
    const payload = {
      userId: 'user-123',
      schoolId: 'school-abc',
      role: 'admin' as const,
      email: 'principal@school.edu',
    };

    const token = generateAuthToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyAuthToken(token);
    expect(decoded.userId).toBe('user-123');
    expect(decoded.schoolId).toBe('school-abc');
    expect(decoded.role).toBe('admin');
    expect(decoded.email).toBe('principal@school.edu');
  });

  it('fails verification for tampered token', () => {
    expect(() => verifyAuthToken('invalid.token.here')).toThrow();
  });
});

describe('Privacy & Data Masking Utilities', () => {
  it('masks phone numbers to protect student privacy in audit logs', () => {
    expect(maskPhoneNumber('+919876543210')).toBe('+9198 *** 10');
    expect(maskPhoneNumber('9876543210')).toBe('98765 *** 10');
    expect(maskPhoneNumber('')).toBe('N/A');
  });

  it('masks student names appropriately', () => {
    expect(maskStudentName('Aarav Sharma')).toBe('Aarav S***');
    expect(maskStudentName('Priya')).toBe('P***');
    expect(maskStudentName('')).toBe('N/A');
  });
});

describe('Authentication & Role Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: jest.Mock;

  beforeEach(() => {
    mockReq = { headers: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFn = jest.fn();
  });

  it('rejects requests with missing Authorization header (401)', () => {
    authenticate(mockReq as Request, mockRes as Response, nextFn);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(nextFn).not.toHaveBeenCalled();
  });

  it('rejects requests with malformed Bearer token (401)', () => {
    mockReq.headers = { authorization: 'Bearer malformed.bad.token' };
    authenticate(mockReq as Request, mockRes as Response, nextFn);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(nextFn).not.toHaveBeenCalled();
  });

  it('authorizes request with valid JWT and populates req.user', () => {
    const token = generateAuthToken({
      userId: 'u1',
      schoolId: 's1',
      role: 'teacher',
      email: 'teacher@school.edu',
    });

    mockReq.headers = { authorization: `Bearer ${token}` };
    authenticate(mockReq as Request, mockRes as Response, nextFn);

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

    const adminOnly = requireRole(['admin']);
    adminOnly(mockReq as Request, mockRes as Response, nextFn);

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

    const adminOnly = requireRole(['admin']);
    adminOnly(mockReq as Request, mockRes as Response, nextFn);

    expect(nextFn).toHaveBeenCalled();
  });
});

describe('Multi-School Boundary & Tenant Isolation Queries', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

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
    const findSpy = jest.spyOn(Template, 'find').mockReturnValue({
      sort: sortMock,
    } as any);

    await listTemplates(mockReq as Request, mockRes as Response);

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
    jest.spyOn(Template, 'findOneAndDelete').mockResolvedValue(null);

    await deleteTemplate(mockReq as Request, mockRes as Response);

    expect(Template.findOneAndDelete).toHaveBeenCalledWith({
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
    const findSpy = jest.spyOn(Campaign, 'find').mockReturnValue({ select: selectMock } as any);

    await listCampaigns(mockReq as Request, mockRes as Response);

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

    jest.spyOn(Campaign, 'findOne').mockResolvedValue(null);

    await getCampaignById(mockReq as Request, mockRes as Response);

    expect(Campaign.findOne).toHaveBeenCalledWith({
      _id: 'campaign-from-school-A',
      schoolId: 'school-B-id',
    });
    expect(mockRes.status).toHaveBeenCalledWith(404);
  });
});
