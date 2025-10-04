'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type Position = {
  x: number;
  y: number;
};

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;

export default function SnakeGame() {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>(() => {
    // 组件第一次渲染时执行，且仅执行一次
    let initial;
    do {
      initial = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (initial.x === 10 && initial.y === 10); // 避免与蛇头重合
    return initial;
  });
  const foodRef = useRef<Position>(food);
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [gameStarted, setGameStarted] = useState(false);
  
  const directionRef = useRef(direction);
  const gameOverRef = useRef(gameOver);
  const isPausedRef = useRef(isPaused);

  // 生成食物位置
  const generateFood = useCallback((): Position => {
    console.trace('generateFood 被调用');
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snake.some(s => s.x === newFood.x && s.y === newFood.y));
    
    console.log('新食物位置生成:', newFood);

    return newFood;
  }, [snake]);

  // 初始化食物
  // 处理键盘输入
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOverRef.current) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (directionRef.current !== 'DOWN') {
            setDirection('UP');
            directionRef.current = 'UP';
          }
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (directionRef.current !== 'UP') {
            setDirection('DOWN');
            directionRef.current = 'DOWN';
          }
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (directionRef.current !== 'RIGHT') {
            setDirection('LEFT');
            directionRef.current = 'LEFT';
          }
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (directionRef.current !== 'LEFT') {
            setDirection('RIGHT');
            directionRef.current = 'RIGHT';
          }
          break;
        case ' ':
          if (!gameStarted) {
            startGame();
          } else {
            setIsPaused(prev => {
              isPausedRef.current = !prev;
              return !prev;
            });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameStarted]);

  // 游戏主循环
  useEffect(() => {
    console.log('【定时器启动】speed =', speed);
    if (gameOver || isPaused || !gameStarted) return;

    const moveSnake = () => {
      console.log('游戏主循环执行');
      // 在 moveSnake 内部，提前“快照”当前食物坐标
      const currentFood = foodRef.current; // ✅ 快照，确保是这次循环的食物
      setSnake(prevSnake => {
        const head = { ...prevSnake[0] };

        // 根据方向移动蛇头
        switch (directionRef.current) {
          case 'UP':
            head.y -= 1;
            break;
          case 'DOWN':
            head.y += 1;
            break;
          case 'LEFT':
            head.x -= 1;
            break;
          case 'RIGHT':
            head.x += 1;
            break;
        }

        console.log('蛇头', head, '食物', currentFood);

        // 检查是否撞墙
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setGameOver(true);
          gameOverRef.current = true;
          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('snakeHighScore', score.toString());
          }
          return prevSnake;
        }

        // 检查是否撞到自己
        if (prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
          setGameOver(true);
          gameOverRef.current = true;
          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('snakeHighScore', score.toString());
          }
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        // ✅ 用快照做碰撞检测，而不是 foodRef.current
        const hasEaten = head.x === currentFood.x && head.y === currentFood.y;
        if (hasEaten) {
          const newFood = generateFood();
          console.log('>>> 设置食物前，旧食物=', currentFood);
          setFood(newFood);
          foodRef.current = newFood; // 同时更新ref，确保下一次循环立即生效
          console.log('蛇吃到食物，生成新食物位置');
          setScore(prev => prev + 10);
          
          // 每吃5个食物增加速度
          if (score > 0 && score % 50 === 0) {
            setSpeed(prev => Math.max(prev - 10, 50));
          }
        } else {
          // 如果没吃到食物，移除尾部
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const gameInterval = setInterval(moveSnake, speed);
    return () => {
      console.log('【定时器清理】');
      clearInterval(gameInterval);
    };
  }, [generateFood, score, speed, gameOver, isPaused, gameStarted, highScore]);

  // 更新引用值
  useEffect(() => {
    directionRef.current = direction;
    gameOverRef.current = gameOver;
    isPausedRef.current = isPaused;
  }, [direction, gameOver, isPaused]);

  // 更新food引用
  useEffect(() => {
    foodRef.current = food;
  }, [food]);

  // 从localStorage加载最高分
  useEffect(() => {
    const savedHighScore = localStorage.getItem('snakeHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
  }, []);

  // 开始游戏
  const startGame = () => {
    setGameStarted(true);
  };

  // 重新开始游戏
  const resetGame = () => {
    const newFood = generateFood();
    setSnake([{ x: 10, y: 10 }]);
    // 先更新ref，再更新状态
    foodRef.current = newFood;
    setFood(newFood);
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    setGameOver(false);
    gameOverRef.current = false;
    setScore(0);
    setIsPaused(false);
    isPausedRef.current = false;
    setSpeed(INITIAL_SPEED);
    setGameStarted(true);
  };



  // 控制按钮处理
  const handleDirectionChange = (newDirection: Direction) => {
    if (!gameStarted && newDirection !== 'RIGHT') return;
    
    if (
      (newDirection === 'UP' && directionRef.current !== 'DOWN') ||
      (newDirection === 'DOWN' && directionRef.current !== 'UP') ||
      (newDirection === 'LEFT' && directionRef.current !== 'RIGHT') ||
      (newDirection === 'RIGHT' && directionRef.current !== 'LEFT')
    ) {
      setDirection(newDirection);
      directionRef.current = newDirection;
    }
  };

  // 触摸控制
  const handleTouchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    handleTouchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!handleTouchStart.current) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const diffX = endX - handleTouchStart.current.x;
    const diffY = endY - handleTouchStart.current.y;

    // 判断滑动方向 - 阈值为30px
    if (Math.abs(diffX) > 30 || Math.abs(diffY) > 30) {
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // 水平滑动
        if (diffX > 0 && directionRef.current !== 'LEFT') {
          handleDirectionChange('RIGHT');
        } else if (diffX < 0 && directionRef.current !== 'RIGHT') {
          handleDirectionChange('LEFT');
        }
      } else {
        // 垂直滑动
        if (diffY > 0 && directionRef.current !== 'UP') {
          handleDirectionChange('DOWN');
        } else if (diffY < 0 && directionRef.current !== 'DOWN') {
          handleDirectionChange('UP');
        }
      }
    }

    handleTouchStart.current = null;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md mx-auto">
        {/* 游戏标题和分数 */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-600 mb-2">
            贪吃蛇
          </h1>
          <div className="flex justify-between items-center bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-4 mb-4">
            <div className="text-lg font-semibold">
              分数: <span className="text-green-600 font-bold">{score}</span>
            </div>
            <div className="text-lg font-semibold">
              最高分: <span className="text-purple-600 font-bold">{highScore}</span>
            </div>
            <div className="flex gap-2">
              {gameStarted && !gameOver && (
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isPaused 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white' 
                      : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white'
                  }`}
                >
                  {isPaused ? '继续' : '暂停'}
                </button>
              )}
              <button
                onClick={gameStarted ? resetGame : startGame}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all"
              >
                {gameStarted ? '重新开始' : '开始游戏'}
              </button>
            </div>
          </div>
        </div>

        {/* 游戏区域 */}
        <div 
          className="relative bg-gradient-to-br from-emerald-50 to-cyan-100 border-4 border-indigo-300 rounded-xl shadow-2xl overflow-hidden"
          style={{ 
            width: GRID_SIZE * CELL_SIZE, 
            height: GRID_SIZE * CELL_SIZE 
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* 网格线 */}
          <div className="absolute inset-0 bg-grid-pattern bg-[length:20px_20px] opacity-20"></div>
          
          {/* 蛇 */}
          {snake.map((segment, index) => (
            <div
              key={`${segment.x}-${segment.y}-${index}`}
              className={`absolute rounded-sm transition-all duration-100 ease-in ${
                index === 0 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-700' // 蛇头
                  : index % 2 === 0
                    ? 'bg-gradient-to-r from-green-500 to-green-400'  // 蛇身1
                    : 'bg-gradient-to-r from-green-400 to-green-300'  // 蛇身2
              }`}
              style={{
                width: CELL_SIZE - 2,
                height: CELL_SIZE - 2,
                left: segment.x * CELL_SIZE + 1,
                top: segment.y * CELL_SIZE + 1,
                zIndex: 10 - index, // 确保蛇头在最上层
              }}
            />
          ))}

          {/* 食物 - 用 ref 立刻反映最新坐标，杜绝闪动 */}
          <div
            className="absolute bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg"
            style={{
              width: CELL_SIZE - 4,
              height: CELL_SIZE - 4,
              left: foodRef.current.x * CELL_SIZE + 2,
              top:  foodRef.current.y * CELL_SIZE + 2,
            }}
          />

          {/* 开始游戏覆盖层 */}
          {!gameStarted && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <div className="text-white text-center p-6 bg-white/20 rounded-2xl backdrop-blur-sm">
                <h2 className="text-2xl font-bold mb-4">欢迎来到贪吃蛇!</h2>
                <p className="mb-6 text-lg">使用方向键或WASD控制蛇的方向</p>
                <button
                  onClick={startGame}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium text-lg transition-all"
                >
                  开始游戏
                </button>
              </div>
            </div>
          )}

          {/* 游戏结束覆盖层 */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <div className="text-white text-center p-6 bg-white/20 rounded-2xl backdrop-blur-sm">
                <div className="text-3xl font-bold mb-2">游戏结束!</div>
                <div className="text-xl mb-4">得分: {score}</div>
                {score === highScore && score > 0 && (
                  <div className="text-yellow-300 text-lg mb-4 animate-bounce">新纪录!</div>
                )}
                <button
                  onClick={resetGame}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium text-lg transition-all"
                >
                  再玩一次
                </button>
              </div>
            </div>
          )}

          {/* 暂停覆盖层 */}
          {isPaused && gameStarted && !gameOver && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="text-white text-3xl font-bold bg-white/20 px-6 py-3 rounded-xl backdrop-blur-sm">
                已暂停
              </div>
            </div>
          )}
        </div>

        {/* 移动端控制按钮 */}
        <div className="mt-6 md:hidden">
          <div className="grid grid-cols-3 gap-3 max-w-[200px] mx-auto">
            <div></div>
            <button
              onClick={() => handleDirectionChange('UP')}
              className="p-4 bg-gradient-to-b from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 rounded-xl text-xl font-bold shadow-md active:scale-95 transition-transform"
              aria-label="上"
            >
              ↑
            </button>
            <div></div>
            <button
              onClick={() => handleDirectionChange('LEFT')}
              className="p-4 bg-gradient-to-b from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 rounded-xl text-xl font-bold shadow-md active:scale-95 transition-transform"
              aria-label="左"
            >
              ←
            </button>
            <div></div>
            <button
              onClick={() => handleDirectionChange('RIGHT')}
              className="p-4 bg-gradient-to-b from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 rounded-xl text-xl font-bold shadow-md active:scale-95 transition-transform"
              aria-label="右"
            >
              →
            </button>
            <div></div>
            <button
              onClick={() => handleDirectionChange('DOWN')}
              className="p-4 bg-gradient-to-b from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 rounded-xl text-xl font-bold shadow-md active:scale-95 transition-transform"
              aria-label="下"
            >
              ↓
            </button>
            <div></div>
          </div>
          <div className="mt-4 text-center text-gray-600">
            <p>使用方向键/WASD或屏幕按钮控制</p>
            <p className="mt-1">滑动屏幕或按空格键暂停</p>
          </div>
        </div>

        {/* 游戏说明 */}
        <div className="mt-6 text-center text-gray-600 bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-md">
          <h2 className="font-bold text-lg mb-2 text-gray-800">游戏说明</h2>
          <ul className="text-left list-disc list-inside space-y-1 max-w-md mx-auto">
            <li>使用方向键或WASD控制蛇的方向</li>
            <li>吃掉红色食物来增长蛇身并获得分数</li>
            <li>避免撞墙或撞到蛇身</li>
            <li>在移动端可以通过滑动手势控制方向</li>
          </ul>
        </div>
      </div>
      
      <footer className="mt-8 text-center text-gray-600 text-sm">
        <p>贪吃蛇游戏 © {new Date().getFullYear()} - 使用Next.js和Tailwind CSS构建</p>
      </footer>
    </div>
  );
}