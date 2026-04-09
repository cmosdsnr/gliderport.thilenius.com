-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:26669
-- Generation Time: Feb 04, 2023 at 09:57 PM
-- Server version: 8.0.29
-- PHP Version: 8.1.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `gliderport`
--

-- --------------------------------------------------------

--
-- Table structure for table `server_sent`
--

CREATE TABLE `server_sent` (
  `id` int NOT NULL,
  `sun` varchar(512) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `online_status` tinyint(1) NOT NULL,
  `online_status_touched` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_record` int NOT NULL,
  `speed` smallint NOT NULL,
  `direction` smallint NOT NULL,
  `humidity` smallint NOT NULL,
  `pressure` int NOT NULL,
  `temperature` smallint NOT NULL,
  `last_image` int NOT NULL,
  `last_forecast` int NOT NULL,
  `video` varchar(100) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

--
-- Dumping data for table `server_sent`
--

INSERT INTO `server_sent` (`id`, `sun`, `online_status`, `online_status_touched`, `last_record`, `speed`, `direction`, `humidity`, `pressure`, `temperature`, `last_image`, `last_forecast`, `video`) VALUES
(1, '{\"solarNoon\":1675541052,\"nadir\":1675497852,\"sunrise\":1675521805,\"sunset\":1675560299,\"sunriseEnd\":1675521966,\"sunsetStart\":1675560138,\"dawn\":1675520259,\"dusk\":1675561845,\"nauticalDawn\":1675518495,\"nauticalDusk\":1675563609,\"nightEnd\":1675516754,\"night\":1675565350,\"goldenHourEnd\":1675523902,\"goldenHour\":1675558202}', 1, '2023-02-04 12:57:46', 1675544260, 37, 278, 58, -468, 654, 1675544267, 1675540982, '{\"width\":1920,\"height\":1080,\"numberConnections\":0}');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
