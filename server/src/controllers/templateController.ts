import { Request, Response } from 'express';
import { Template } from '../models/Template';
import { AuditLog } from '../models/AuditLog';

export async function listTemplates(req: Request, res: Response): Promise<void> {
  try {
    const schoolId = req.user!.schoolId;
    const { category } = req.query;

    const query: any = { schoolId };
    if (category && category !== 'all') {
      query.category = category;
    }

    const templates = await Template.find(query).sort({ updatedAt: -1 });
    res.json({ templates });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch templates.' });
  }
}

export async function createTemplate(req: Request, res: Response): Promise<void> {
  try {
    const { name, category, body, variables } = req.body;
    const schoolId = req.user!.schoolId;
    const userId = req.user!.userId;

    if (!name || !body) {
      res.status(400).json({ error: 'Template name and body are required.' });
      return;
    }

    const template = await Template.create({
      schoolId,
      createdBy: userId,
      name,
      category: category || 'custom',
      body,
      variables: variables || [],
    });

    await AuditLog.create({
      schoolId,
      userId,
      action: 'TEMPLATE_CREATED',
      resourceType: 'Template',
      resourceId: String(template._id),
      details: { name: template.name, category: template.category },
    });

    res.status(201).json({ template });
  } catch (err: any) {
    if (err?.code === 11000) {
      res.status(409).json({ error: 'A template with this name already exists in your school.' });
      return;
    }
    res.status(500).json({ error: err?.message || 'Failed to create template.' });
  }
}

export async function deleteTemplate(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;

    // Enforce tenant boundary: must match both _id and schoolId
    const deleted = await Template.findOneAndDelete({ _id: id, schoolId });
    if (!deleted) {
      res.status(404).json({ error: 'Template not found or does not belong to your school.' });
      return;
    }

    res.json({ message: 'Template deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to delete template.' });
  }
}
