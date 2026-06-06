function success(res, data = {}, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function created(res, data = {}, message = 'Created successfully') {
  return success(res, data, message, 201);
}

function paginated(res, data, total, page, limit, message = 'Data fetched successfully') {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    },
  });
}

module.exports = { success, created, paginated };
