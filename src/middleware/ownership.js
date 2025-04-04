const { AppError } = require('./error');

// Check if user owns the resource
const checkOwnership = (model, paramField = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramField];
      const resource = await model.findById(resourceId);

      if (!resource) {
        return next(new AppError('Resource not found', 404));
      }

      // Check if user is the owner or has admin role
      if (resource.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(new AppError('You do not have permission to access this resource', 403));
      }

      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Check if user is a member of a group/channel
const checkMembership = (model, paramField = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramField];
      const resource = await model.findById(resourceId);

      if (!resource) {
        return next(new AppError('Resource not found', 404));
      }

      // Check if user is a member or has admin role
      const isMember = resource.members.includes(req.user.id) || 
                      resource.admins.includes(req.user.id) || 
                      resource.owner.toString() === req.user.id ||
                      req.user.role === 'admin';

      if (!isMember) {
        return next(new AppError('You must be a member to access this resource', 403));
      }

      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Check if user has required permissions for a specific action
const checkPermission = (action) => {
  return async (req, res, next) => {
    try {
      const resource = req.resource;
      
      // Define permission checks based on action
      const permissionChecks = {
        'update': () => resource.owner.toString() === req.user.id || req.user.role === 'admin',
        'delete': () => resource.owner.toString() === req.user.id || req.user.role === 'admin',
        'moderate': () => resource.admins.includes(req.user.id) || req.user.role === 'admin',
        'invite': () => resource.admins.includes(req.user.id) || req.user.role === 'admin',
        'post': () => resource.members.includes(req.user.id) || req.user.role === 'admin'
      };

      if (!permissionChecks[action] || !permissionChecks[action]()) {
        return next(new AppError(`You do not have permission to ${action} this resource`, 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  checkOwnership,
  checkMembership,
  checkPermission
}; 