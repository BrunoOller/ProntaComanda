const fs = require('fs');
const path = require('path');
const multer = require('multer');
const AppError = require('../utils/AppError');

// Pasta física onde as fotos ficam salvas; servida como estática em app.js
// no caminho público /uploads (ver PASTA_PUBLICA abaixo).
const PASTA_UPLOADS = path.join(__dirname, '..', '..', 'uploads', 'produtos');
const PASTA_PUBLICA = '/uploads/produtos';
fs.mkdirSync(PASTA_UPLOADS, { recursive: true });

const TIPOS_ACEITOS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: PASTA_UPLOADS,
  filename: (req, file, cb) => {
    const extensao = TIPOS_ACEITOS[file.mimetype];
    cb(null, `${req.params.id}-${Date.now()}${extensao}`);
  },
});

const uploadImagemProduto = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!TIPOS_ACEITOS[file.mimetype]) {
      return cb(new AppError('Formato de imagem inválido. Use JPG, PNG ou WEBP.', 400));
    }
    cb(null, true);
  },
}).single('imagem');

module.exports = { uploadImagemProduto, PASTA_UPLOADS, PASTA_PUBLICA };
