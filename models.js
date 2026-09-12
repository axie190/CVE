// models.js
// 포트폴리오 board/schema.sql 에 있는 컬럼들을 그대로 가져와서 씀
// users 테이블은 username, password_hash 컬럼, posts 테이블은 title, author, content, password_hash, is_secret, views 컬럼 
// 원본은 Flask+pymysql+MySQL이고 password는 해시로 저장하는데 여긴 과제용으로 Node.js + Sequelize로 새로 짜는 거라 DB는 SQLite 쓰고 password도 그냥 평문으로 넣음

const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: __dirname + '/data.sqlite',
  // 실제 실행된 SQL을 sql.log에 남김 (인젝션 테스트할 때 진짜 쿼리 확인하려고 넣어둠)
  logging: (msg) => require('fs').appendFileSync(__dirname + '/sql.log', msg + '\n'),
});

// 회원 - board의 users 테이블 컬럼 중 로그인에 필요한 것만 가져옴
const User = sequelize.define('User', {
  username: DataTypes.STRING,
  password: DataTypes.STRING,
}, { tableName: 'users' });

// 게시글 - schema.sql의 posts 테이블 컬럼명 그대로 씀 (password_hash 대신 password로만 이름 줄임)
const Post = sequelize.define('Post', {
  title: DataTypes.STRING,
  author: { type: DataTypes.STRING, defaultValue: '익명' },
  content: DataTypes.TEXT,
  password: DataTypes.STRING,
  isSecret: { type: DataTypes.BOOLEAN, defaultValue: false },
  views: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'posts' });

// 과제용으로 넣은 테이블 
// 정상 경로로는 절대 노출되면 안 되는 값을 하나 넣어두고 SQL Injection이 진짜 되는지 확인할 때 "이 값이 뽑히면 뚫린 거다" 기준으로 씀
const Secret = sequelize.define('Secret', {
  label: DataTypes.STRING,
  value: DataTypes.STRING,
}, { tableName: 'secrets' });

module.exports = { sequelize, User, Post, Secret };